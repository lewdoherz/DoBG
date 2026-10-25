import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
export type MigrationConnection = {
  exec: (sql: string) => Promise<unknown>;
  query: (sql: string, params: string[]) => Promise<{ rows: { name: string; checksum: string }[] }>;
};
export async function applyMigrations(connection: MigrationConnection) {
  await connection.exec('BEGIN');
  try {
    await connection.exec(
      'CREATE TABLE IF NOT EXISTS game_shelf_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    await connection.exec('LOCK TABLE game_shelf_migrations IN EXCLUSIVE MODE');
    const applied = new Map(
      (await connection.query('SELECT name,checksum FROM game_shelf_migrations', [])).rows.map(
        (r) => [r.name, r.checksum],
      ),
    );
    const names = (await readdir(resolve('migrations')))
      .filter((n) => /^\d+_.+\.sql$/.test(n))
      .sort();
    for (const name of names) {
      const sql = await readFile(resolve('migrations', name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(name)) {
        if (applied.get(name) !== checksum)
          throw new Error(`Applied migration was modified: ${name}`);
        continue;
      }
      await connection.exec(sql);
      await connection.query('INSERT INTO game_shelf_migrations (name,checksum) VALUES ($1,$2)', [
        name,
        checksum,
      ]);
    }
    await connection.exec('COMMIT');
  } catch (error) {
    await connection.exec('ROLLBACK');
    throw error;
  }
}
