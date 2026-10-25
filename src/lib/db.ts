import { PGlite } from '@electric-sql/pglite';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyMigrations } from './migrations';
import * as schema from './schema';
type Database = NodePgDatabase<typeof schema>;
type Store = { db: Database; migrate: () => Promise<void>; close: () => Promise<void> };
const globalStore = globalThis as unknown as { gameShelfStore?: Promise<Store> };
async function connect(): Promise<Store> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
    return {
      db: drizzle(pool, { schema }),
      migrate: async () => {
        const client = await pool.connect();
        try {
          await applyMigrations({
            exec: (sql) => client.query(sql),
            query: (sql, params) => client.query(sql, params),
          });
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_DB !== 'true')
    throw new Error('DATABASE_URL is required in production');
  const path = process.env.PGLITE_PATH || './.data/postgres';
  if (path !== 'memory://') await mkdir(resolve(path), { recursive: true });
  const client = new PGlite(path);
  await client.waitReady;
  const migrate = () =>
    applyMigrations({
      exec: (sql) => client.exec(sql),
      query: (sql, params) => client.query(sql, params),
    });
  await migrate();
  // Both drivers implement the PostgreSQL dialect; do not use driver-specific methods in domain code.
  return {
    db: pgliteDrizzle(client, { schema }) as unknown as Database,
    migrate,
    close: () => client.close(),
  };
}
export async function getStore() {
  if (!globalStore.gameShelfStore)
    globalStore.gameShelfStore = connect().catch((error) => {
      delete globalStore.gameShelfStore;
      throw error;
    });
  return globalStore.gameShelfStore;
}
export async function getDb() {
  return (await getStore()).db;
}
