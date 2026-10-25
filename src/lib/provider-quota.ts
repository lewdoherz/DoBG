import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { providerCache, user } from './schema';
import { CollectionError } from './collection';
export async function reserveMetadataRequest(ownerId: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
    const key = `quota:${ownerId}`;
    const row = (await tx.select().from(providerCache).where(eq(providerCache.key, key)))[0];
    const now = new Date();
    const count = row && row.expiresAt > now ? Number(row.payload) : 0;
    if (count >= 12)
      throw new CollectionError(
        429,
        'Too many catalog requests. Wait one minute, or add your game manually.',
      );
    const expiresAt = count ? row!.expiresAt : new Date(Date.now() + 60000);
    await tx
      .insert(providerCache)
      .values({ key, payload: count + 1, expiresAt })
      .onConflictDoUpdate({ target: providerCache.key, set: { payload: count + 1, expiresAt } });
  });
}
