// GET /api/picks?repo=owner/name — community "what should I play next?" leaderboard.
//   options: &limit=1-10  &theme=  &accent=  &format=svg|json
import { loadPicks } from '../lib/picks.js';
import { SourceError } from '../lib/sources.js';
import { renderPicks, renderError } from '../lib/render.js';
import { send, queryOf } from '../lib/util.js';
import { recordUse } from '../lib/stats.js';

export default async function handler(req, res) {
  const q = queryOf(req);
  const opts = { theme: q.get('theme') || 'dark', accent: q.get('accent') || '' };
  const asJson = q.get('format') === 'json';
  try {
    const picks = await loadPicks(q.get('repo') || '', parseInt(q.get('limit') || '5', 10) || 5);
    await recordUse('picks', q.get('repo'));
    if (asJson) return send(res, 200, JSON.stringify({ picks }, null, 2), 'application/json; charset=utf-8', 600);
    return send(res, 200, renderPicks(picks, opts), 'image/svg+xml; charset=utf-8', 600);
  } catch (e) {
    const message = e instanceof SourceError ? e.message : 'Something went wrong';
    if (!(e instanceof SourceError)) console.error(e);
    if (asJson) return send(res, 400, JSON.stringify({ error: message }), 'application/json; charset=utf-8', 0);
    return send(res, 200, renderError(message, opts), 'image/svg+xml; charset=utf-8', 60);
  }
}
