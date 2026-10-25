import { and, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { games, entries, editions, copies, user } from './schema';
import { identity, type Entry, type EntryInput } from './model';
export class CollectionError extends Error {
  constructor(
    public status: number,
    message: string,
    public existingId?: string,
  ) {
    super(message);
  }
}
export async function listEntries(ownerId: string): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db
    .select({ entry: entries, game: games, edition: editions })
    .from(entries)
    .innerJoin(games, eq(entries.gameId, games.id))
    .innerJoin(editions, eq(entries.editionId, editions.id))
    .where(eq(entries.ownerId, ownerId))
    .orderBy(entries.updatedAt);
  const ownedCopies = await db
    .select({ copy: copies, edition: editions })
    .from(copies)
    .innerJoin(entries, eq(copies.entryId, entries.id))
    .innerJoin(editions, eq(copies.editionId, editions.id))
    .where(eq(entries.ownerId, ownerId))
    .orderBy(copies.position);
  const byEntry = new Map<string, Entry['copies']>();
  for (const { copy, edition } of ownedCopies) {
    const group = byEntry.get(copy.entryId) || [];
    group.push({ id: copy.id, location: copy.location, edition: edition.data });
    byEntry.set(copy.entryId, group);
  }
  return rows
    .map(({ entry, game, edition }) => ({
      id: entry.exportId,
      metadata: game.userMetadata,
      source: game.source,
      ...entry.personal,
      edition: edition.data,
      copies: byEntry.get(entry.id) || [],
      updatedAt: entry.updatedAt.toISOString(),
    }))
    .reverse();
}
export async function saveEntry(ownerId: string, input: EntryInput, id?: string): Promise<string> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // A row lock serializes mutations per account, including duplicate detection.
    await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
    const existing = id
      ? (
          await tx
            .select()
            .from(entries)
            .where(and(eq(entries.ownerId, ownerId), eq(entries.exportId, id)))
        )[0]
      : undefined;
    if (id && !existing) throw new CollectionError(404, 'Game not found');
    const previous = existing
      ? (await tx.select().from(games).where(eq(games.id, existing.gameId)))[0]
      : undefined;
    const source = previous ? previous.source : input.source;
    const key = identity({ ...input, source });
    const duplicate = (
      await tx
        .select({ entry: entries })
        .from(games)
        .innerJoin(entries, eq(entries.gameId, games.id))
        .where(and(eq(games.ownerId, ownerId), eq(games.identity, key)))
    )[0];
    if (duplicate && duplicate.entry.id !== existing?.id)
      throw new CollectionError(
        409,
        'This game is already on your shelf. Open the existing entry to update it or add a physical copy.',
        duplicate.entry.exportId,
      );
    const gameId = existing?.gameId || randomUUID();
    const entryId = existing?.id || randomUUID();
    const exportId = existing?.exportId || randomUUID();
    const previousCopyIds = new Set(
      existing
        ? (await tx.select({ id: copies.id }).from(copies).where(eq(copies.entryId, entryId))).map((c) => c.id)
        : [],
    );
    const oldEditionIds = existing
      ? (
          await tx.select({ id: editions.id }).from(editions).where(eq(editions.gameId, gameId))
        ).map((e) => e.id)
      : [];
    if (existing)
      await tx
        .update(games)
        .set({ identity: key, userMetadata: input.metadata })
        .where(eq(games.id, gameId));
    else
      await tx
        .insert(games)
        .values({ id: gameId, ownerId, identity: key, userMetadata: input.metadata, source });
    const editionId = randomUUID();
    await tx.insert(editions).values({ id: editionId, gameId, data: input.edition });
    const personal = {
      status: input.status,
      notes: input.notes,
      pitch: input.pitch,
      tags: input.tags,
      rating: input.rating,
    };
    if (existing) {
      await tx.delete(copies).where(eq(copies.entryId, entryId));
      await tx
        .update(entries)
        .set({ editionId, personal, updatedAt: new Date() })
        .where(eq(entries.id, entryId));
    } else
      await tx
        .insert(entries)
        .values({ id: entryId, exportId, ownerId, gameId, editionId, personal });
    for (const [position, copy] of input.copies.entries()) {
      const copyEditionId = randomUUID();
      await tx.insert(editions).values({ id: copyEditionId, gameId, data: copy.edition });
      await tx
        .insert(copies)
        .values({
          id: copy.id && previousCopyIds.has(copy.id) ? copy.id : randomUUID(),
          entryId, editionId: copyEditionId, location: copy.location, position,
        });
    }
    if (oldEditionIds.length) await tx.delete(editions).where(inArray(editions.id, oldEditionIds));
    return exportId;
  });
}
export async function removeEntry(ownerId: string, id: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
    const existing = (
      await tx
        .select()
        .from(entries)
        .where(and(eq(entries.ownerId, ownerId), eq(entries.exportId, id)))
    )[0];
    if (!existing) throw new CollectionError(404, 'Game not found');
    await tx.delete(entries).where(eq(entries.id, existing.id));
    await tx.delete(games).where(eq(games.id, existing.gameId));
  });
}
export async function importEntries(ownerId: string, inputs: EntryInput[]) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
    const current = await tx
      .select({ identity: games.identity, exportId: entries.exportId })
      .from(entries)
      .innerJoin(games, eq(entries.gameId, games.id))
      .where(eq(entries.ownerId, ownerId));
    const keys = new Set(current.map((c) => c.identity));
    const ids = new Set(current.map((c) => c.exportId));
    let imported = 0,
      skipped = 0;
    for (const input of inputs) {
      const key = identity(input);
      if (keys.has(key) || (input.id && ids.has(input.id))) {
        skipped++;
        continue;
      }
      const gameId = randomUUID(),
        entryId = randomUUID(),
        editionId = randomUUID(),
        exportId = input.id || randomUUID();
      await tx
        .insert(games)
        .values({
          id: gameId,
          ownerId,
          identity: key,
          userMetadata: input.metadata,
          source: input.source,
        });
      await tx.insert(editions).values({ id: editionId, gameId, data: input.edition });
      await tx
        .insert(entries)
        .values({
          id: entryId,
          exportId,
          ownerId,
          gameId,
          editionId,
          personal: {
            status: input.status,
            notes: input.notes,
            pitch: input.pitch,
            tags: input.tags,
            rating: input.rating,
          },
        });
      for (const [position, copy] of input.copies.entries()) {
        const copyEdition = randomUUID();
        await tx.insert(editions).values({ id: copyEdition, gameId, data: copy.edition });
        await tx
          .insert(copies)
          .values({ id: randomUUID(), entryId, editionId: copyEdition, location: copy.location, position });
      }
      keys.add(key);
      ids.add(exportId);
      imported++;
    }
    return { imported, skipped };
  });
}
