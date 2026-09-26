import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import card from '../api/card.js';
import picks from '../api/picks.js';
import stats from '../api/stats.js';
import { encodeData } from '../lib/sources.js';
import { clearCaches } from '../lib/wiki.js';
import { clearPicksCache } from '../lib/picks.js';
import { mockFetch, call } from './helpers.js';

const GAMES = { now_playing: { title: 'Astro Bot', platform: 'PS5' } };
let redis;
let calls;

function setup({ enabled = true } = {}) {
  clearCaches();
  clearPicksCache();
  calls = [];
  redis = { sets: {}, down: false };
  if (enabled) {
    process.env.KV_REST_API_URL = 'https://redis.test';
    process.env.KV_REST_API_TOKEN = 'test-token';
  } else {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  }
  globalThis.fetch = mockFetch({
    calls,
    redis,
    files: { '/alice/alice/HEAD/games.json': GAMES, '/bob/bob/HEAD/games.json': GAMES },
    issues: { 'alice/alice': [] },
  });
}
beforeEach(() => setup());

const count = async () => JSON.parse((await call(stats, '/api/stats')).body);

test('counts each GitHub user once, case-insensitively', async () => {
  await call(card, '/api/card?user=alice');
  await call(card, '/api/card?user=Alice&theme=light');
  await call(card, '/api/card?user=bob');
  assert.deepEqual(await count(), { gamers: 2, picks_boards: 0 });
});

test('does not count anonymous links or failed loads', async () => {
  await call(card, `/api/card?data=${encodeData(GAMES)}&user=alice`);
  await call(card, '/api/card?playing=Hades');
  await call(card, '/api/card?user=nobody');
  await call(card, '/api/card?user=../x');
  assert.deepEqual(await count(), { gamers: 0, picks_boards: 0 });
});

test('counts picks boards', async () => {
  await call(picks, '/api/picks?repo=alice/alice');
  await call(picks, '/api/picks?repo=nope/missing');
  assert.equal((await count()).picks_boards, 1);
});

test('badge and shields formats', async () => {
  await call(card, '/api/card?user=alice');
  const badge = await call(stats, '/api/stats?format=badge');
  assert.match(badge.headers['content-type'], /svg/);
  assert.match(badge.body, />1 gamer</);
  const shields = JSON.parse((await call(stats, '/api/stats?format=shields')).body);
  assert.equal(shields.schemaVersion, 1);
  assert.equal(shields.message, '1 gamer');
});

test('a Redis outage never breaks cards', async () => {
  redis.down = true;
  const res = await call(card, '/api/card?user=alice');
  assert.match(res.body, /Astro Bot/);
  const badge = await call(stats, '/api/stats?format=badge');
  assert.equal(badge.statusCode, 200);
  assert.match(badge.body, />gamers</);
});

test('without Upstash configured nothing is recorded and cards still work', async () => {
  setup({ enabled: false });
  const res = await call(card, '/api/card?user=alice');
  assert.match(res.body, /Astro Bot/);
  assert.ok(!calls.some((u) => u.includes('redis.test')));
  assert.equal((await call(stats, '/api/stats')).statusCode, 503);
  assert.match((await call(stats, '/api/stats?format=badge')).body, />gamers</);
});
