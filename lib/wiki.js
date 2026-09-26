// Game info + cover art from Wikipedia. Every card credits Wikipedia and links the article.
import { fetchWithTimeout, createCache } from './util.js';

const API = 'https://en.wikipedia.org/w/api.php';
const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Covers can come from Wikipedia or from a few well-known image hosts. Anything else
// is ignored so the service can't be used to fetch arbitrary URLs.
const ALLOWED_IMAGE_HOSTS = [
  /^upload\.wikimedia\.org$/,
  /^github\.com$/,
  /^([\w-]+\.)*githubusercontent\.com$/,
  /^i\.imgur\.com$/,
];

const lookupCache = createCache();
const imageCache = createCache(300);

export function isAllowedImageUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (u.hostname === 'github.com' && !u.pathname.startsWith('/user-attachments/')) return false;
    return ALLOWED_IMAGE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

function pickPage(pages) {
  const sorted = [...pages].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return sorted.find((p) => /video game/i.test(p.description || '')) || sorted.find((p) => /game/i.test(p.description || '')) || sorted[0];
}

// title: the game's name. article: optional exact Wikipedia article title to skip searching.
export async function lookupGame(title, article = '') {
  const key = `${article || title}`.toLowerCase();
  const cached = lookupCache.get(key);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'pageimages|description|info',
    piprop: 'thumbnail|name',
    pithumbsize: '320',
    // Game box art is non-free (fair use), so it has to be requested explicitly.
    pilicense: 'any',
    inprop: 'url',
  });
  if (article) {
    params.set('titles', article);
  } else {
    params.set('generator', 'search');
    params.set('gsrsearch', `${title} video game`);
    params.set('gsrlimit', '5');
  }

  let result = null;
  try {
    const res = await fetchWithTimeout(`${API}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pages = ((await res.json()).query?.pages || []).filter((p) => !p.missing);
    const page = pages.length ? pickPage(pages) : null;
    if (page) {
      result = {
        title: page.title,
        url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        description: page.description || '',
        image: page.thumbnail?.source || '',
        imageFile: page.pageimage ? `https://en.wikipedia.org/wiki/File:${encodeURIComponent(page.pageimage)}` : '',
      };
    }
    lookupCache.set(key, result);
  } catch (e) {
    console.warn(`Wikipedia lookup failed for "${title}": ${e.message}`);
  }
  return result;
}

// Downloads an allow-listed image. Returns { type, buf } or null.
export async function fetchImage(url) {
  if (!url || !isAllowedImageUrl(url)) return null;
  const cached = imageCache.get(url);
  if (cached !== undefined) return cached;
  let image = null;
  try {
    const res = await fetchWithTimeout(url, { redirect: 'follow' });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!res.ok || !IMAGE_TYPES.has(type)) throw new Error(`HTTP ${res.status} ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('image too large');
    image = { type, buf };
    imageCache.set(url, image);
  } catch (e) {
    console.warn(`Image fetch failed (${url}): ${e.message}`);
  }
  return image;
}

// Returns a data: URI, because images inside an SVG served through <img> can't load external URLs.
export async function imageToDataUri(url) {
  const image = await fetchImage(url);
  return image ? `data:${image.type};base64,${image.buf.toString('base64')}` : '';
}

export function clearCaches() {
  lookupCache.clear();
  imageCache.clear();
}
