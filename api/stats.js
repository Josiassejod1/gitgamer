// GET /api/stats — how many people use gitgamer.
//   format=json (default) | badge (SVG) | shields (for img.shields.io/endpoint)
import { getStats, statsEnabled } from '../lib/stats.js';
import { renderBadge } from '../lib/render.js';
import { send, queryOf } from '../lib/util.js';

const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

export default async function handler(req, res) {
  const format = queryOf(req).get('format') || 'json';
  let stats = null;
  if (statsEnabled()) {
    try {
      stats = await getStats();
    } catch (e) {
      console.warn(`stats: ${e.message}`);
    }
  }
  const message = stats ? `${formatCount(stats.gamers)} ${stats.gamers === 1 ? 'gamer' : 'gamers'}` : 'gamers';

  if (format === 'badge') return send(res, 200, renderBadge('🎮 used by', message), 'image/svg+xml; charset=utf-8', stats ? 600 : 60);
  if (format === 'shields') {
    return send(res, 200, JSON.stringify({ schemaVersion: 1, label: '🎮 used by', message, color: 'ff69b4' }), 'application/json; charset=utf-8', stats ? 600 : 60);
  }
  if (!stats) return send(res, 503, JSON.stringify({ error: 'Stats are not set up on this deployment' }), 'application/json; charset=utf-8', 0);
  return send(res, 200, JSON.stringify(stats), 'application/json; charset=utf-8', 600);
}
