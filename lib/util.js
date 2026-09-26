export const USER_AGENT = 'gitgamer/1.0 (https://github.com/Josiassejod1/gitgamer)';

export async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export const escapeXml = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export const clean = (s, max = 120) =>
  typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function formatDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const d = new Date(iso + 'T12:00:00Z');
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Small LRU-ish cache; warm serverless instances reuse it between requests.
export function createCache(limit = 500, ttlMs = 6 * 60 * 60 * 1000) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) {
        map.delete(key);
        return undefined;
      }
      map.delete(key);
      map.set(key, hit);
      return hit.value;
    },
    set(key, value) {
      map.set(key, { value, at: Date.now() });
      if (map.size > limit) map.delete(map.keys().next().value);
    },
    clear: () => map.clear(),
  };
}

export function send(res, status, body, type, cacheSeconds) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    cacheSeconds > 0 ? `public, max-age=${Math.min(cacheSeconds, 1800)}, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` : 'no-store',
  );
  if (type.startsWith('image/svg')) res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'");
  res.end(body);
}

export const queryOf = (req) => new URL(req.url, 'http://localhost').searchParams;
