import { requireUser, json, failure } from '@/lib/http';
import { CollectionError } from '@/lib/collection';
import { requestBgg, parseSearch, getBggGame, providerConfigured } from '@/lib/provider';
import { reserveMetadataRequest } from '@/lib/provider-quota';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const params = new URL(request.url).searchParams;
    if (params.has('status'))
      return json({
        configured: providerConfigured(),
        logo: providerConfigured() ? process.env.BGG_ATTRIBUTION_LOGO_URL : null,
      });
    if (providerConfigured()) await reserveMetadataRequest(user.id);
    const id = params.get('id');
    if (id) {
      if (!/^\d{1,10}$/.test(id)) throw new CollectionError(400, 'Invalid game ID');
      return json(await getBggGame(id));
    }
    const query = params.get('q')?.trim();
    if (!query || query.length > 200)
      throw new CollectionError(400, 'Enter a title of up to 200 characters.');
    const { xml, stale } = await requestBgg(
      `search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`,
    );
    return json({ matches: parseSearch(xml), stale, attribution: 'BoardGameGeek' });
  } catch (error) {
    return failure(error);
  }
}
