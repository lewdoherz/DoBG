import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { parseSearch, parseThing, requestBgg, ProviderUnavailable } from '../src/lib/provider';
import { getStore, getDb } from '../src/lib/db';
import { providerCache } from '../src/lib/schema';
process.env.PGLITE_PATH = 'memory://';
after(async () => {
  await (await getStore()).close();
});
test('BGG XML keeps aliases and unavailable metadata unknown', () => {
  const m = parseThing(
    '<items><item type="boardgame" id="1"><name type="primary" value="测试"/><name type="alternate" value="Test"/><minplayers value="2"/><maxplayers value="4"/><link type="boardgameexpansion" inbound="false" value="More"/></item></items>',
  );
  assert.equal(m.title, '测试');
  assert.deepEqual(m.aliases, ['Test']);
  assert.equal(m.maxMinutes, null);
  assert.equal(m.complexity, null);
  assert.deepEqual(m.expansions, ['More']);
  assert.deepEqual(parseSearch('<items total="0"/>'), []);
});
test('unconfigured provider never sends an external request', async () => {
  delete process.env.BGG_API_TOKEN;
  let calls = 0;
  await assert.rejects(
    requestBgg('search?query=none', async () => {
      calls++;
      return new Response();
    }),
    ProviderUnavailable,
  );
  assert.equal(calls, 0);
});
test('authorization failures are bounded; expired cached data is labelled stale', async () => {
  process.env.BGG_API_TOKEN = 'test-only-not-a-real-token';
  process.env.BGG_INTEGRATION_APPROVED = 'true';
  process.env.BGG_ATTRIBUTION_LOGO_URL = 'https://example.invalid/official-logo.png';
  let calls = 0;
  const denied: typeof fetch = async () => {
    calls++;
    return new Response('', { status: 403 });
  };
  await assert.rejects(requestBgg('search?query=denied', denied), /rejected/);
  assert.equal(calls, 1);
  const db = await getDb();
  await db
    .insert(providerCache)
    .values({
      key: 'search?query=cached',
      payload: '<items><item id="7" type="boardgame"><name value="Cached game"/></item></items>',
      expiresAt: new Date(0),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
  const result = await requestBgg('search?query=cached', denied);
  assert.equal(result.stale, true);
  assert.deepEqual(parseSearch(result.xml).map((match) => match.title), ['Cached game']);
  assert.equal(calls, 2);
  assert.ok(Date.now() - new Date(result.fetchedAt).getTime() >= 24 * 60 * 60 * 1000);
});
test('a transient provider outage is retried and then serves real returned XML', async () => {
  let attempts = 0;
  const result = await requestBgg('search?query=retry', async () => {
    attempts++;
    return attempts === 1
      ? new Response('', { status: 503 })
      : new Response('<items><item id="42" type="boardgame"><name value="Returned game"/></item></items>');
  });
  assert.equal(attempts, 2);
  assert.equal(result.stale, false);
  assert.deepEqual(parseSearch(result.xml).map((match) => match.title), ['Returned game']);
});
