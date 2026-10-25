import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  entrySchema,
  emptyMetadata,
  emptyEdition,
  archiveSchema,
  matches,
  fits,
  identity,
  type Entry,
} from '../src/lib/model';
const entry: Entry = {
  id: '6f4626b9-21dc-46b2-8c72-6b11aaebaf7c',
  metadata: {
    ...emptyMetadata(),
    title: '山林冒险',
    aliases: ['Forest Adventure'],
    minPlayers: 2,
    maxPlayers: 4,
    minMinutes: 30,
    maxMinutes: 60,
    complexity: 2.5,
  },
  source: null,
  status: 'owned',
  edition: emptyEdition(),
  copies: [{ location: '客厅', edition: emptyEdition() }],
  notes: 'Private',
  pitch: '',
  tags: ['合作'],
  rating: 8,
  updatedAt: new Date().toISOString(),
};
test('Unicode aliases and storage locations are searchable without case/width sensitivity', () => {
  assert.equal(matches(entry, 'FOREST'), true);
  assert.equal(matches(entry, 'Ｆｏｒｅｓｔ'), true);
  assert.equal(matches(entry, '山林'), true);
  assert.equal(matches(entry, '客厅'), true);
  assert.equal(matches(entry, '合作 adventure'), true);
  assert.equal(matches(entry, 'other'), false);
});
test('play fit enforces inclusive boundaries, ownership, and conservative unknown values', () => {
  assert.equal(fits(entry, 4, 60, 2.5), true);
  assert.equal(fits(entry, 1, 60, 3), false);
  assert.equal(fits(entry, 4, 59, 3), false);
  assert.equal(fits(entry, 4, 60, 2), false);
  assert.equal(fits({ ...entry, status: 'wishlist' }, 4, 60, 3), false);
  assert.equal(
    fits({ ...entry, metadata: { ...entry.metadata, maxMinutes: null } }, 4, 60, 3),
    false,
  );
  assert.equal(
    fits({ ...entry, metadata: { ...entry.metadata, complexity: null } }, 4, 60, 3),
    false,
  );
});
test('owned/wishlist copy invariants and range ordering reject ambiguous records', () => {
  assert.equal(entrySchema.safeParse({ ...entry, copies: [] }).success, false);
  assert.equal(entrySchema.safeParse({ ...entry, status: 'wishlist' }).success, false);
  assert.equal(
    entrySchema.safeParse({
      ...entry,
      metadata: { ...entry.metadata, minPlayers: 5, maxPlayers: 2 },
    }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      ...entry,
      metadata: { ...entry.metadata, cover: 'http://unsafe.example/image.jpg' },
    }).success,
    false,
  );
  assert.equal(entrySchema.safeParse({ ...entry, status: 'wishlist', copies: [] }).success, true);
});
test('versioned archive rejects one malformed entry rather than silently dropping it', () => {
  assert.equal(
    archiveSchema.safeParse({
      format: 'game-shelf',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: [entry, { ...entry, rating: 11 }],
    }).success,
    false,
  );
  assert.equal(
    archiveSchema.safeParse({
      format: 'game-shelf',
      version: 2,
      exportedAt: new Date().toISOString(),
      entries: [entry],
    }).success,
    false,
  );
});
test('manual identities normalize full-width titles without inventing external identifiers', () => {
  assert.equal(
    identity({ ...entry, metadata: { ...entry.metadata, title: ' ＧＡＭＥ ' } }),
    'custom:game',
  );
});
