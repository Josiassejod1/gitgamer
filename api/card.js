// GET /api/card — the embeddable "now playing" card.
//   source:  ?user= | ?gist= | ?data= | ?playing=   (see lib/sources.js)
//   options: &theme=dark|light|neon|retro  &accent=ff00aa  &layout=full|compact  &recent=0-5  &format=svg|json
import { loadData, SourceError } from '../lib/sources.js';
import { buildCard } from '../lib/card.js';
import { renderCard, renderError } from '../lib/render.js';
import { send, queryOf } from '../lib/util.js';
import { recordUse } from '../lib/stats.js';

function clampRecent(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 5 : Math.max(0, Math.min(5, n));
}

// Counts real users, only after their games.json actually loaded. Mirrors loadData's source order.
function trackSource(q) {
  if (q.get('data')) return null;
  if (q.get('gist')) return recordUse('gists', q.get('gist'));
  if (q.get('user')) return recordUse('users', q.get('user'));
  return null;
}

// Cards backed by a games.json or gist change when their owner edits the file, so keep them
// fresh (GitHub's raw file cache adds up to 5 more minutes). ?data= and ?playing= cards are
// fully described by their URL, so they can be cached much longer.
const LIVE_CACHE_SECONDS = 300;
const FIXED_CACHE_SECONDS = 6 * 60 * 60;
const cacheSecondsFor = (q) => (!q.get('data') && (q.get('user') || q.get('gist')) ? LIVE_CACHE_SECONDS : FIXED_CACHE_SECONDS);

export default async function handler(req, res) {
  const q = queryOf(req);
  const opts = {
    theme: q.get('theme') || 'dark',
    accent: q.get('accent') || '',
    layout: q.get('layout') === 'compact' ? 'compact' : 'full',
    recent: clampRecent(q.get('recent')),
  };
  const asJson = q.get('format') === 'json';

  try {
    const data = await loadData(q);
    const [card] = await Promise.all([
      buildCard(data, { recent: opts.layout === 'compact' ? 0 : opts.recent, images: !asJson }),
      trackSource(q),
    ]);
    if (asJson) {
      const strip = (g) => g && { title: g.title, platform: g.platform, status: g.status, started: g.started, ended: g.ended, link: g.link, wikipedia: g.wikipedia };
      return send(res, 200, JSON.stringify({ username: card.username, name: card.name, now_playing: strip(card.now), recently_played: card.recent.map(strip), credit: 'Game info and cover art from Wikipedia' }, null, 2), 'application/json; charset=utf-8', cacheSecondsFor(q));
    }
    return send(res, 200, renderCard(card, opts), 'image/svg+xml; charset=utf-8', cacheSecondsFor(q));
  } catch (e) {
    const message = e instanceof SourceError ? e.message : 'Something went wrong';
    if (!(e instanceof SourceError)) console.error(e);
    // Status 200 so the error card still shows up inside READMEs.
    if (asJson) return send(res, 400, JSON.stringify({ error: message }), 'application/json; charset=utf-8', 0);
    return send(res, 200, renderError(message, opts), 'image/svg+xml; charset=utf-8', 60);
  }
}
