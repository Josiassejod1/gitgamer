// GET /api/cover?title=<game>[&wiki=<article>] — a game's cover thumbnail, for the builder page.
// Uses the same Wikipedia lookup as the cards, so the builder shows exactly the art the card will.
import { lookupGame, fetchImage } from '../lib/wiki.js';
import { clean, send, queryOf } from '../lib/util.js';

export default async function handler(req, res) {
  const q = queryOf(req);
  const title = clean(q.get('title'), 100);
  const wiki = clean(q.get('wiki'), 150);
  if (!title && !wiki) return send(res, 400, 'Missing title', 'text/plain; charset=utf-8', 0);
  const found = await lookupGame(title || wiki, wiki);
  const image = found?.image ? await fetchImage(found.image) : null;
  if (!image) return send(res, 404, 'No cover found', 'text/plain; charset=utf-8', 3600);
  return send(res, 200, image.buf, image.type, 7 * 24 * 60 * 60);
}
