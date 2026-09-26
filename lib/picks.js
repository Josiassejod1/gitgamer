// Community picks: open issues titled "[Rec] <game>" (or labeled game-rec) in any public repo.
// 👍 reactions on each issue are its votes.
import { fetchWithTimeout, clean, createCache } from './util.js';
import { SourceError } from './sources.js';

const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
export const REC_PREFIX = /^\[rec\]\s*/i;
export const REC_LABEL = 'game-rec';

// Anonymous GitHub API calls are limited to 60/hour per IP, so keep results briefly.
const cache = createCache(200, 5 * 60 * 1000);
export const clearPicksCache = () => cache.clear();

function gameFromIssue(issue) {
  const form = (issue.body || '').match(/^###\s+Game\s*\n+([^\n]+)/im);
  const fromForm = form && form[1].trim() !== '_No response_' ? form[1] : '';
  return clean(fromForm || issue.title.replace(REC_PREFIX, ''), 100);
}

export async function loadPicks(repo, limit = 5) {
  if (!REPO.test(repo) || repo.includes('..')) throw new SourceError('repo must look like owner/name');
  const key = repo.toLowerCase();
  let all = cache.get(key);
  if (!all) {
    all = await fetchPicks(repo);
    cache.set(key, all);
  }
  return all.slice(0, Math.max(1, Math.min(10, limit)));
}

async function fetchPicks(repo) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res;
  try {
    res = await fetchWithTimeout(`https://api.github.com/repos/${repo}/issues?state=open&per_page=100`, { headers });
  } catch {
    throw new SourceError('Could not reach GitHub');
  }
  if (res.status === 404) throw new SourceError('Repo not found (is it public?)');
  if (res.status === 403 || res.status === 429) throw new SourceError('GitHub rate limit reached. Try again soon');
  if (!res.ok) throw new SourceError(`GitHub returned ${res.status}`);
  const issues = await res.json();
  return issues
    .filter((i) => !i.pull_request && (REC_PREFIX.test(i.title) || i.labels?.some((l) => l.name === REC_LABEL)))
    .map((i) => ({ title: gameFromIssue(i), votes: i.reactions?.['+1'] || 0, by: i.user?.login || '', url: i.html_url, created: i.created_at }))
    .filter((p) => p.title)
    .sort((a, b) => b.votes - a.votes || String(a.created).localeCompare(String(b.created)));
}
