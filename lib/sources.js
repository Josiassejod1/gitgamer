// Where a card's game list comes from. In priority order:
//   ?data=<base64url JSON>              everything in the URL, no setup
//   ?gist=<id>                          a games.json in a GitHub gist
//   ?user=<login>[&repo=..][&path=..]   a games.json in a GitHub repo (default: the profile repo)
//   ?playing=<title>[&platform=..]      one game, quickest possible embed
import { fetchWithTimeout, clean } from './util.js';

const GH_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;
const FILE_PATH = /^[A-Za-z0-9._\-/]{1,200}\.json$/;
const GIST_ID = /^[a-f0-9]{8,64}$/i;
const MAX_JSON_BYTES = 100 * 1024;
export const MAX_RECENT = 12;

export class SourceError extends Error {}

export function normalizeGame(g) {
  if (!g || typeof g !== 'object') return null;
  const title = clean(g.title, 100);
  if (!title) return null;
  return {
    title,
    platform: clean(g.platform, 30),
    status: clean(g.status, 20),
    started: clean(g.started, 10),
    ended: clean(g.ended, 10),
    cover: typeof g.cover === 'string' ? g.cover.trim().slice(0, 500) : '',
    url: typeof g.url === 'string' && /^https?:\/\//.test(g.url) ? g.url.trim().slice(0, 500) : '',
    wiki: clean(g.wiki, 150),
  };
}

export function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SourceError('games.json must be a JSON object');
  const recent = Array.isArray(raw.recently_played) ? raw.recently_played : [];
  return {
    // The GitHub username is what cards show (as @username); name is the older free-text label.
    username: GH_NAME.test(raw.username || '') ? raw.username : '',
    name: clean(raw.name, 40),
    backloggd: /^[A-Za-z0-9_-]{1,40}$/.test(raw.backloggd || '') ? raw.backloggd : '',
    now_playing: normalizeGame(raw.now_playing),
    recently_played: recent.map(normalizeGame).filter(Boolean).slice(0, MAX_RECENT),
  };
}

async function fetchJson(url, headers = {}) {
  let res;
  try {
    res = await fetchWithTimeout(url, { headers });
  } catch {
    throw new SourceError('Could not reach GitHub');
  }
  if (res.status === 404) throw new SourceError('games.json not found');
  if (res.status === 403 || res.status === 429) throw new SourceError('GitHub rate limit reached. Try again soon');
  if (!res.ok) throw new SourceError(`GitHub returned ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_JSON_BYTES) throw new SourceError('games.json is too large');
  try {
    return JSON.parse(text);
  } catch {
    throw new SourceError('games.json is not valid JSON');
  }
}

export function encodeData(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export async function loadData(q) {
  if (q.get('data')) {
    const raw = q.get('data');
    if (raw.length > 8000) throw new SourceError('data parameter is too long; use a games.json file instead');
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
      throw new SourceError('data parameter is not valid base64url JSON');
    }
    return normalizeData(parsed);
  }

  if (q.get('gist')) {
    const id = q.get('gist');
    if (!GIST_ID.test(id)) throw new SourceError('Invalid gist id');
    const headers = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const gist = await fetchJson(`https://api.github.com/gists/${id}`, headers);
    const files = Object.values(gist.files || {});
    const file = files.find((f) => f.filename === 'games.json') || files.find((f) => f.filename?.endsWith('.json'));
    if (!file?.content) throw new SourceError('No games.json in that gist');
    try {
      return normalizeData(JSON.parse(file.content));
    } catch (e) {
      throw e instanceof SourceError ? e : new SourceError('games.json is not valid JSON');
    }
  }

  if (q.get('user')) {
    const user = q.get('user');
    const repo = q.get('repo') || user;
    const file = q.get('path') || 'games.json';
    if (!GH_NAME.test(user)) throw new SourceError('Invalid GitHub username');
    if (!REPO_NAME.test(repo) || repo.includes('..')) throw new SourceError('Invalid repo name');
    if (!FILE_PATH.test(file) || file.includes('..')) throw new SourceError('Invalid path');
    const data = normalizeData(await fetchJson(`https://raw.githubusercontent.com/${user}/${repo}/HEAD/${file}`));
    // The file lives in this user's repo, so they're the player.
    data.username ||= user;
    return data;
  }

  if (q.get('playing')) {
    return normalizeData({
      name: q.get('name') || '',
      username: q.get('username') || '',
      now_playing: { title: q.get('playing'), platform: q.get('platform') || '', started: q.get('since') || '' },
    });
  }

  throw new SourceError('Add ?user=, ?gist=, ?data= or ?playing= to the URL');
}
