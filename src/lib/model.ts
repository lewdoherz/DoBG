import { z } from 'zod';
const text = z.string().trim().max(500);
const list = z.array(z.string().trim().min(1).max(160)).max(50);
const integer = z.number().int().min(1).max(10000).nullable();
export const metadataSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    aliases: list.default([]),
    description: z.string().max(20000).default(''),
    cover: z
      .union([
        z.literal(''),
        z.url().refine((v) => v.startsWith('https://'), 'Use an HTTPS image URL'),
      ])
      .default(''),
    year: z.number().int().min(-5000).max(9999).nullable().default(null),
    minPlayers: integer.default(null),
    maxPlayers: integer.default(null),
    minMinutes: integer.default(null),
    maxMinutes: integer.default(null),
    age: z.number().int().min(0).max(99).nullable().default(null),
    complexity: z.number().min(1).max(5).nullable().default(null),
    mechanics: list.default([]),
    categories: list.default([]),
    kind: z.enum(['base', 'expansion', 'unknown']).default('unknown'),
    baseGames: list.default([]),
    expansions: list.default([]),
  })
  .superRefine((v, ctx) => {
    for (const [min, max] of [
      ['minPlayers', 'maxPlayers'],
      ['minMinutes', 'maxMinutes'],
    ] as const) {
      if (v[min] !== null && v[max] !== null && v[min]! > v[max]!)
        ctx.addIssue({
          code: 'custom',
          path: [max],
          message: 'Maximum must be at least the minimum',
        });
    }
  });
export const editionSchema = z.object({
  name: text.default(''),
  language: text.default(''),
  publisher: text.default(''),
});
export const copySchema = z.object({
  id: z.uuid().optional(),
  location: text.default(''),
  edition: editionSchema,
});
export const sourceSchema = z.object({
  provider: z.literal('bgg'),
  externalId: z.string().regex(/^\d{1,10}$/),
  url: z.url().startsWith('https://boardgamegeek.com/boardgame/'),
  fetchedAt: z.iso.datetime(),
  metadata: metadataSchema,
});
export const entrySchema = z
  .object({
    id: z.uuid().optional(),
    metadata: metadataSchema,
    source: sourceSchema.nullable().default(null),
    status: z.enum(['owned', 'wishlist']),
    edition: editionSchema,
    copies: z.array(copySchema).max(100),
    notes: z.string().max(10000).default(''),
    pitch: z.string().max(500).default(''),
    tags: list.default([]),
    rating: z.number().min(0).max(10).nullable().default(null),
  })
  .superRefine((v, ctx) => {
    const copyIds = v.copies.flatMap((copy) => copy.id ? [copy.id] : []);
    if (new Set(copyIds).size !== copyIds.length)
      ctx.addIssue({ code: 'custom', path: ['copies'], message: 'Each physical copy must have a unique identity' });
    if (v.status === 'owned' && !v.copies.length)
      ctx.addIssue({
        code: 'custom',
        path: ['copies'],
        message: 'Owned games need at least one physical copy',
      });
    if (v.status === 'wishlist' && v.copies.length)
      ctx.addIssue({
        code: 'custom',
        path: ['copies'],
        message: 'Wishlist entries cannot have physical copies',
      });
  });
export type Metadata = z.infer<typeof metadataSchema>;
export type Edition = z.infer<typeof editionSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type Entry = EntryInput & { id: string; updatedAt: string };
export const archiveSchema = z.object({
  format: z.literal('game-shelf'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  entries: z.array(entrySchema).max(2000),
});
export const emptyMetadata = (): Metadata => metadataSchema.parse({ title: 'Untitled game' });
export const emptyEdition = (): Edition => ({ name: '', language: '', publisher: '' });
export function identity(e: EntryInput) {
  return e.source ? `bgg:${e.source.externalId}` : `custom:${normalize(e.metadata.title)}`;
}
export function normalize(s: string) {
  return s.normalize('NFKC').toLocaleLowerCase().trim();
}
export function matches(e: Entry, query: string) {
  const haystack = normalize(
    [
      e.metadata.title,
      ...e.metadata.aliases,
      ...e.tags,
      e.edition.publisher,
      ...e.copies.map((c) => c.location),
    ].join(' '),
  );
  return normalize(query)
    .split(/\s+/)
    .every((q) => haystack.includes(q));
}
export function fits(e: Entry, players?: number, minutes?: number, difficulty?: number) {
  const m = e.metadata;
  return (
    e.status === 'owned' &&
    (!players ||
      (m.minPlayers !== null &&
        m.maxPlayers !== null &&
        m.minPlayers <= players &&
        m.maxPlayers >= players)) &&
    (!minutes || (m.maxMinutes !== null && m.maxMinutes <= minutes)) &&
    (!difficulty || (m.complexity !== null && m.complexity <= difficulty))
  );
}
