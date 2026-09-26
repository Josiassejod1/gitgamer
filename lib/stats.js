// Usage stats: how many people have a gitgamer card or picks board.
// Stored in Upstash Redis (Vercel Storage → Upstash). Entirely optional: without the
// env vars nothing is recorded and cards work exactly the same.
//
// Only public identifiers are stored: GitHub usernames, gist ids and repo names that
// already appear in the card URL.
import { fetchWithTimeout } from './util.js';

const KEYS = {
  users: 'gitgamer:users', // GitHub usernames with a games.json card
  gists: 'gitgamer:gists', // gist-backed cards
  picks: 'gitgamer:picks', // repos with a picks board
};
const TIMEOUT_MS = 800;

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export const statsEnabled = () => Boolean(config());

async function pipeline(commands) {
  const cfg = config();
  if (!cfg) return null;
  const res = await fetchWithTimeout(
    `${cfg.url}/pipeline`,
    { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) },
    TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Upstash returned ${res.status}`);
  return (await res.json()).map((r) => r.result);
}

// Never throws and never waits long: a stats outage must not break a card.
export async function recordUse(kind, id) {
  if (!KEYS[kind] || !id || !config()) return;
  try {
    await pipeline([['SADD', KEYS[kind], String(id).toLowerCase().slice(0, 150)]]);
  } catch (e) {
    console.warn(`stats: could not record ${kind}: ${e.message}`);
  }
}

export async function getStats() {
  const [users, gists, picks] = (await pipeline([['SCARD', KEYS.users], ['SCARD', KEYS.gists], ['SCARD', KEYS.picks]])) || [];
  return { gamers: (Number(users) || 0) + (Number(gists) || 0), picks_boards: Number(picks) || 0 };
}
