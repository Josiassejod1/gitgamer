import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import card from '../api/card.js';
import { encodeData } from '../lib/sources.js';
import { clearCaches, isAllowedImageUrl } from '../lib/wiki.js';
import { mockFetch, call } from './helpers.js';

const GAMES = {
  name: 'Dalvin',
  now_playing: { title: "Marvel's Wolverine", platform: 'PS5', started: '2026-09-26' },
  recently_played: [
    { title: 'Astro Bot', platform: 'PS5', status: 'Finished' },
    { title: 'Hades II', platform: 'PC', status: 'Dropped' },
  ],
};

let calls;
beforeEach(() => {
  clearCaches();
  calls = [];
  globalThis.fetch = mockFetch({
    calls,
    files: { '/dalvin/dalvin/HEAD/games.json': GAMES, '/bad/bad/HEAD/games.json': '{nope' },
  });
});

test('renders a card from a games.json in the profile repo', async () => {
  const res = await call(card, '/api/card?user=dalvin');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /image\/svg\+xml/);
  assert.equal(res.headers['cache-control'], 'public, max-age=300, s-maxage=300, stale-while-revalidate=600', 'games.json cards refresh within minutes');
  assert.match(res.body, /Marvel&#39;s Wolverine/);
  assert.match(res.body, /NOW PLAYING/);
  assert.match(res.body, /RECENTLY PLAYED/);
  assert.match(res.body, /Astro Bot/);
  assert.match(res.body, /data:image\/png;base64,/, 'cover art is inlined');
  assert.match(res.body, /Wikipedia/, 'credits Wikipedia');
  assert.ok(!/https?:\/\/upload/.test(res.body), 'no external image URLs in the SVG');
});

test('prefers the Wikipedia article that is a video game', async () => {
  const res = await call(card, '/api/card?user=dalvin&format=json');
  const body = JSON.parse(res.body);
  assert.equal(body.now_playing.wikipedia.title, "Marvel's Wolverine");
  assert.equal(body.now_playing.link, "https://en.wikipedia.org/wiki/Marvel's_Wolverine");
  assert.equal(body.recently_played.length, 2);
  assert.match(body.credit, /Wikipedia/);
});

test('data= embeds work with no GitHub file', async () => {
  const res = await call(card, `/api/card?data=${encodeData(GAMES)}&theme=light&layout=compact`);
  assert.match(res.body, /Wolverine/);
  assert.ok(!res.body.includes('RECENTLY PLAYED'), 'compact layout hides history');
  assert.match(res.body, /width="500"/);
  assert.ok(!calls.some((u) => u.includes('githubusercontent')));
  assert.match(res.headers['cache-control'], /s-maxage=21600, stale-while-revalidate=86400/, 'link-only cards never change, so cache them longer');
});

test('playing= quick embed', async () => {
  const res = await call(card, '/api/card?playing=Elden%20Ring&platform=PC&name=Sam');
  assert.match(res.body, /Elden Ring/);
  assert.match(res.body, /SAM · PLAYER 1/);
});

test('recent=0 hides history; theme + accent apply', async () => {
  const res = await call(card, '/api/card?user=dalvin&recent=0&theme=neon&accent=00ff00');
  assert.ok(!res.body.includes('RECENTLY PLAYED'));
  assert.match(res.body, /#00ff00/);
  assert.match(res.body, /#05010f/);
});

test('errors render as an SVG card, not a broken image', async () => {
  for (const [path, msg] of [
    ['/api/card', /Add \?user=/],
    ['/api/card?user=nobody', /games\.json not found/],
    ['/api/card?user=bad', /not valid JSON/],
    ['/api/card?user=../etc', /Invalid GitHub username/],
    ['/api/card?user=dalvin&path=../../x.json', /Invalid path/],
    ['/api/card?data=%%%', /not valid base64url JSON/],
  ]) {
    const res = await call(card, path);
    assert.equal(res.statusCode, 200, path);
    assert.match(res.body, msg, path);
    assert.match(res.headers['cache-control'], /s-maxage=60/);
  }
  const json = await call(card, '/api/card?format=json');
  assert.equal(json.statusCode, 400);
});

test('user text is escaped in the SVG', async () => {
  const evil = { now_playing: { title: '<script>alert(1)</script> & "x"', platform: '<b>' } };
  const res = await call(card, `/api/card?data=${encodeData(evil)}`);
  assert.ok(!res.body.includes('<script>'));
  assert.ok(!res.body.includes('<b>'));
  assert.match(res.body, /&lt;script&gt;/);
});

test('only allow-listed cover hosts are fetched', async () => {
  const data = { now_playing: { title: 'Astro Bot', cover: 'http://169.254.169.254/latest/meta-data' } };
  await call(card, `/api/card?data=${encodeData(data)}`);
  assert.ok(!calls.some((u) => u.includes('169.254')));
  assert.ok(calls.some((u) => u.includes('upload.wikimedia.org')), 'falls back to Wikipedia art');
  assert.equal(isAllowedImageUrl('https://github.com/user-attachments/assets/abc'), true);
  assert.equal(isAllowedImageUrl('https://github.com/evil/repo'), false);
  assert.equal(isAllowedImageUrl('https://upload.wikimedia.org.evil.com/x.png'), false);
});

test('Wikipedia results are cached between requests', async () => {
  await call(card, '/api/card?user=dalvin');
  const first = calls.filter((u) => u.includes('wikipedia')).length;
  await call(card, '/api/card?user=dalvin');
  assert.equal(calls.filter((u) => u.includes('wikipedia')).length, first);
});

test('cover endpoint serves the same Wikipedia art the card uses', async () => {
  const { default: cover } = await import('../api/cover.js');
  const res = await call(cover, "/api/cover?title=Marvel's%20Wolverine&wiki=Marvel's%20Wolverine");
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.match(res.headers['cache-control'], /s-maxage=604800/);
  assert.ok(calls.some((u) => u.includes('titles=Marvel')), 'looks up the exact article when wiki is given');

  const missing = await call(cover, '/api/cover?title=Nothing%20Matches');
  assert.equal(missing.statusCode, 404);
  assert.equal((await call(cover, '/api/cover')).statusCode, 400);
});
