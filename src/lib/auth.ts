import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from './db';
import * as schema from './schema';
let instance: Auth<BetterAuthOptions> | undefined;
export async function getAuth() {
  if (instance) return instance;
  const db = await getDb();
  if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET)
    throw new Error('BETTER_AUTH_SECRET is required');
  const options: BetterAuthOptions = {
    appName: 'Game Shelf',
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret:
      process.env.BETTER_AUTH_SECRET || 'local-development-only-do-not-deploy-this-secret-123456',
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      disableSignUp: process.env.DISABLE_SIGNUP === 'true',
    },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  };
  const created = betterAuth(options);
  instance = created;
  return created;
}
