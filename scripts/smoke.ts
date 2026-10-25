import assert from 'node:assert/strict';
import { emptyMetadata, emptyEdition } from '../src/lib/model';
const base = process.env.SMOKE_URL || 'http://localhost:3000';
const stamp = Date.now();
class Client {
  cookie = '';
  async call(path: string, method = 'GET', body?: unknown, origin = base) {
    const r = await fetch(base + path, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: this.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookies = r.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.map((c) => c.split(';')[0]).join('; ');
    const data = await r.json();
    return { status: r.status, data };
  }
  async register(name: string) {
    const r = await this.call('/api/auth/sign-up/email', 'POST', {
      name: `Smoke ${name}`,
      email: `smoke-${name}-${stamp}@example.test`,
      password: `Smoke-only-${stamp}!`,
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
}
const a = new Client(),
  b = new Client(),
  anonymous = new Client();
assert.equal((await anonymous.call('/api/collection')).status, 401);
await a.register('owner');
await b.register('other');
console.log('PASS: registration and anonymous denial');
const input = {
  metadata: {
    ...emptyMetadata(),
    title: `Smoke 山林 ${stamp}`,
    aliases: ['Forest Night'],
    minPlayers: 2,
    maxPlayers: 4,
    minMinutes: 30,
    maxMinutes: 60,
    complexity: 2.5,
  },
  source: null,
  status: 'owned',
  edition: { name: 'First edition', language: '简体中文', publisher: 'Custom' },
  copies: [{ location: 'Private shelf', edition: emptyEdition() }],
  notes: 'Owner private note',
  pitch: 'Bring friends',
  tags: ['合作'],
  rating: 8,
};
let r = await a.call('/api/collection', 'POST', input);
assert.equal(r.status, 201, JSON.stringify(r.data));
const id = r.data.id;
assert.equal((await b.call(`/api/collection/${id}`)).status, 404);
assert.equal((await b.call(`/api/collection/${id}`, 'PUT', input)).status, 404);
assert.equal((await b.call(`/api/collection/${id}`, 'DELETE')).status, 404);
assert.equal((await b.call('/api/collection')).data.entries.length, 0);
assert.equal(
  (await a.call(`/api/collection/${id}`, 'PUT', input, 'https://untrusted.example')).status,
  403,
);
console.log('PASS: cross-account reads/writes/deletes and CSRF origin isolation');
const duplicate = await a.call('/api/collection', 'POST', input);
assert.equal(duplicate.status, 409);
assert.equal(duplicate.data.existingId, id);
const changed = {
  ...input,
  notes: 'Updated and persistent',
  copies: [
    ...input.copies,
    {
      location: 'Second shelf',
      edition: { name: 'Second edition', language: 'English', publisher: 'Another' },
    },
  ],
};
assert.equal((await a.call(`/api/collection/${id}`, 'PUT', changed)).status, 200);
const reread = (await a.call(`/api/collection/${id}`)).data.entry;
assert.equal(reread.notes, 'Updated and persistent');
assert.equal(reread.copies.length, 2);
assert.equal(reread.copies[1].edition.language, 'English');
console.log('PASS: duplicate conflict, edit persistence, separate physical-copy editions');
const concurrent = { ...input, metadata: { ...input.metadata, title: `Concurrent ${stamp}` } };
const race = await Promise.all([
  a.call('/api/collection', 'POST', concurrent),
  a.call('/api/collection', 'POST', concurrent),
]);
assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
console.log('PASS: concurrent duplicate adds produce one entry');
const archive = (await a.call('/api/export')).data;
assert.equal(archive.format, 'game-shelf');
assert.equal(archive.version, 1);
const malformed = {
  ...archive,
  entries: [
    { ...input, metadata: { ...input.metadata, title: 'Should not partially import' } },
    { ...input, rating: 12 },
  ],
};
assert.equal((await b.call('/api/import', 'POST', malformed)).status, 400);
assert.equal((await b.call('/api/collection')).data.entries.length, 0);
r = await b.call('/api/import', 'POST', archive);
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.imported, 2);
r = await b.call('/api/import', 'POST', archive);
assert.equal(r.data.imported, 0);
assert.equal(r.data.skipped, 2);
const imported = (await b.call('/api/collection')).data.entries.find(
  (e: { id: string }) => e.id === id,
);
assert.equal(imported.notes, reread.notes);
assert.equal(imported.copies.length, 2);
await b.call(`/api/collection/${id}`, 'PUT', { ...imported, notes: 'Other account edit' });
assert.equal((await a.call(`/api/collection/${id}`)).data.entry.notes, 'Updated and persistent');
console.log(
  'PASS: versioned export/import, full validation, idempotence, imported account isolation',
);
const provider = await a.call('/api/metadata?q=Forest');
assert.equal(provider.status, 503);
assert.equal(provider.data.unavailable, true);
console.log('PASS: unconfigured provider returns explicit unavailable state');
const secondDevice = new Client();
r = await secondDevice.call('/api/auth/sign-in/email', 'POST', {
  email: `smoke-owner-${stamp}@example.test`,
  password: `Smoke-only-${stamp}!`,
});
assert.equal(r.status, 200);
assert.equal(
  (await secondDevice.call(`/api/collection/${id}`)).data.entry.notes,
  'Updated and persistent',
);
console.log('PASS: independent login session reads persisted collection');
for (const client of [a, b])
  for (const e of (await client.call('/api/collection')).data.entries)
    assert.equal((await client.call(`/api/collection/${e.id}`, 'DELETE')).status, 200);
await a.call('/api/auth/sign-out', 'POST', {});
assert.equal((await a.call('/api/collection')).status, 401);
console.log(
  'PASS: removal and revoked sign-out session. Smoke accounts contain no collection entries.',
);
