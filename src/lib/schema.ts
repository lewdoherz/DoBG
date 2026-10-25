import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  integer,
  bigint,
} from 'drizzle-orm/pg-core';
import type { Metadata, EntryInput, Edition } from './model';
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
export const rateLimit = pgTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
});
export const games = pgTable(
  'game',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    identity: text('identity').notNull(),
    userMetadata: jsonb('user_metadata').$type<Metadata>().notNull(),
    source: jsonb('source').$type<EntryInput['source']>(),
  },
  (t) => [uniqueIndex('game_owner_identity').on(t.ownerId, t.identity)],
);
export const editions = pgTable('edition', {
  id: text('id').primaryKey(),
  gameId: text('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<Edition>().notNull(),
});
export const entries = pgTable(
  'collection_entry',
  {
    id: text('id').primaryKey(),
    exportId: text('export_id').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    gameId: text('game_id')
      .notNull()
      .unique()
      .references(() => games.id, { onDelete: 'cascade' }),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    personal: jsonb('personal')
      .$type<Pick<EntryInput, 'status' | 'notes' | 'pitch' | 'tags' | 'rating'>>()
      .notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('entry_owner_export').on(t.ownerId, t.exportId)],
);
export const copies = pgTable(
  'physical_copy',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
    editionId: text('edition_id').notNull().references(() => editions.id),
    location: text('location').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [uniqueIndex('copy_entry_position').on(t.entryId, t.position)],
);
export const providerCache = pgTable('provider_cache', {
  key: text('key').primaryKey(),
  payload: jsonb('payload').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
