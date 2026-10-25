import { XMLParser } from 'fast-xml-parser';
import { eq } from 'drizzle-orm';
import { setTimeout as sleep } from 'node:timers/promises';
import { getDb } from './db';
import { providerCache } from './schema';
import { emptyMetadata, metadataSchema, type Metadata, type EntryInput } from './model';
export class ProviderUnavailable extends Error {}
export function providerConfigured() {
  return !!(
    process.env.BGG_API_TOKEN &&
    process.env.BGG_INTEGRATION_APPROVED === 'true' &&
    process.env.BGG_ATTRIBUTION_LOGO_URL?.startsWith('https://')
  );
}
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  processEntities: false,
});
type BggResponse = { xml: string; stale: boolean; fetchedAt: string };
const requests = new Map<string, Promise<BggResponse>>();
let nextRequest = 0;
export async function requestBgg(
  path: string,
  fetcher: typeof fetch = fetch,
): Promise<BggResponse> {
  if (!providerConfigured())
    throw new ProviderUnavailable(
      'Online search is not configured. Add a game manually, or ask the administrator to configure approved BGG access.',
    );
  const db = await getDb();
  const cached = (await db.select().from(providerCache).where(eq(providerCache.key, path)))[0];
  if (cached && cached.expiresAt > new Date())
    return {
      xml: cached.payload as string,
      stale: false,
      fetchedAt: cached.createdAt.toISOString(),
    };
  const pending = requests.get(path);
  if (pending) return pending;
  const task = (async () => {
    let message =
      'BoardGameGeek is temporarily unavailable. Try again later or add the game manually.';
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = Math.max(Date.now(), nextRequest);
      nextRequest = start + 5000;
      await sleep(Math.max(0, start - Date.now()));
      try {
        const response = await fetcher(`https://boardgamegeek.com/xmlapi2/${path}`, {
          headers: { Authorization: `Bearer ${process.env.BGG_API_TOKEN}` },
          signal: AbortSignal.timeout(10000),
          cache: 'no-store',
          redirect: 'error',
        });
        if (response.ok && response.status !== 202) {
          const xml = await response.text();
          if (xml.length > 2_000_000 || !xml.includes('<items'))
            throw new ProviderUnavailable(message);
          const createdAt = new Date(),
            expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
          await db
            .insert(providerCache)
            .values({ key: path, payload: xml, expiresAt, createdAt })
            .onConflictDoUpdate({
              target: providerCache.key,
              set: { payload: xml, expiresAt, createdAt },
            });
          return { xml, stale: false, fetchedAt: createdAt.toISOString() };
        }
        if (response.status === 401 || response.status === 403) {
          message =
            'BGG access was rejected. Manual entry is available; the administrator must check API authorization.';
          break;
        }
        if (![202, 429, 500, 502, 503, 504].includes(response.status)) break;
        const retry = Number(response.headers.get('retry-after'));
        if (Number.isFinite(retry) && retry > 0)
          nextRequest = Math.max(nextRequest, Date.now() + Math.min(retry, 15) * 1000);
      } catch {
        /* Bounded retry; never log bearer credentials or upstream bodies. */
      }
    }
    if (cached && Date.now() - cached.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000)
      return {
        xml: cached.payload as string,
        stale: true,
        fetchedAt: cached.createdAt.toISOString(),
      };
    throw new ProviderUnavailable(message);
  })();
  requests.set(path, task);
  try {
    return await task;
  } finally {
    requests.delete(path);
  }
}
type XmlNode = Record<string, any>;
function array(value: any): XmlNode[] {
  return value ? (Array.isArray(value) ? value : [value]) : [];
}
function number(value: any) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function parseSearch(xml: string) {
  const parsed = parser.parse(xml);
  return array(parsed.items?.item)
    .slice(0, 40)
    .map((item) => ({
      id: String(item.id),
      title: String(array(item.name)[0]?.value || ''),
      year: number(item.yearpublished?.value),
      kind: item.type === 'boardgameexpansion' ? 'expansion' : item.type === 'boardgame' ? 'base' : 'unknown',
    }));
}
export function parseThing(xml: string): Metadata {
  const item = array(parser.parse(xml).items?.item)[0];
  if (!item)
    throw new ProviderUnavailable(
      'No metadata was returned for this game. Manual entry is available.',
    );
  const names = array(item.name),
    links = array(item.link);
  const m = {
    ...emptyMetadata(),
    title: String((names.find((n) => n.type === 'primary') || names[0])?.value || ''),
    aliases: names.filter((n) => n.type !== 'primary').map((n) => String(n.value)),
    description: String(item.description || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&#10;/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
    cover: String(item.image || ''),
    year: number(item.yearpublished?.value),
    minPlayers: number(item.minplayers?.value),
    maxPlayers: number(item.maxplayers?.value),
    minMinutes: number(item.minplaytime?.value),
    maxMinutes: number(item.maxplaytime?.value),
    age: number(item.minage?.value),
    complexity: number(item.statistics?.ratings?.averageweight?.value),
    mechanics: links.filter((l) => l.type === 'boardgamemechanic').map((l) => String(l.value)),
    categories: links.filter((l) => l.type === 'boardgamecategory').map((l) => String(l.value)),
    kind: item.type === 'boardgameexpansion' ? 'expansion' : item.type === 'boardgame' ? 'base' : 'unknown',
    baseGames: links
      .filter((l) => l.type === 'boardgameexpansion' && String(l.inbound) === 'true')
      .map((l) => String(l.value)),
    expansions: links
      .filter((l) => l.type === 'boardgameexpansion' && String(l.inbound) !== 'true')
      .map((l) => String(l.value)),
  };
  const result = metadataSchema.safeParse(m);
  if (!result.success)
    throw new ProviderUnavailable(
      'The provider returned unsupported or incomplete metadata. Add this game manually.',
    );
  return result.data;
}
export async function getBggGame(
  id: string,
): Promise<{ metadata: Metadata; source: EntryInput['source']; stale: boolean }> {
  const { xml, stale, fetchedAt } = await requestBgg(`thing?id=${encodeURIComponent(id)}&stats=1`);
  const metadata = parseThing(xml);
  return {
    metadata,
    source: {
      provider: 'bgg',
      externalId: id,
      url: `https://boardgamegeek.com/boardgame/${id}`,
      fetchedAt,
      metadata,
    },
    stale,
  };
}
