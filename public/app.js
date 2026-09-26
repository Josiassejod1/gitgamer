const $ = (id) => document.getElementById(id);
const ORIGIN = location.origin;
const PLATFORMS = ['', 'PC', 'PS5', 'PS4', 'Xbox Series X|S', 'Xbox One', 'Switch 2', 'Switch', 'Steam Deck', 'Mobile', 'Retro', 'Other'];
const STATUSES = ['Finished', 'Played', 'Dropped', 'On hold', '100%'];
const STORE_KEY = 'gitgamer-draft';
const today = () => new Date().toISOString().slice(0, 10);
const validUsername = (u) => typeof u === 'string' && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(u);
// People often type their handle as @name; accept that.
const readUsername = () => $('username').value.trim().replace(/^@/, '');

let state = load() || { username: '', now_playing: null, recently_played: [] };

// Shown in the preview until someone adds a game, and loadable with "Try an example list".
const EXAMPLE = {
  now_playing: { title: 'Hades II', platform: 'PC', wiki: 'Hades II' },
  recently_played: [
    { title: 'Elden Ring', platform: 'PS5', status: 'Finished', wiki: 'Elden Ring' },
    { title: 'Astro Bot', platform: 'PS5', status: '100%', wiki: 'Astro Bot' },
    { title: "Baldur's Gate 3", platform: 'PC', status: 'Finished', wiki: "Baldur's Gate 3" },
    { title: 'Tears of the Kingdom', platform: 'Switch', status: 'Played', wiki: 'The Legend of Zelda: Tears of the Kingdom' },
  ],
};
const isEmpty = () => !state.now_playing && !state.recently_played.length;

// ---------- persistence (per-browser convenience only) ----------
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
}

// ---------- data export ----------
const exportGame = (g, recent) => {
  const out = { title: g.title };
  if (g.platform) out.platform = g.platform;
  if (recent && g.status) out.status = g.status;
  if (g.started) out.started = g.started;
  if (recent && g.ended) out.ended = g.ended;
  if (g.wiki) out.wiki = g.wiki;
  return out;
};
function exportData() {
  const data = {};
  if (state.username) data.username = state.username;
  if (state.now_playing) data.now_playing = exportGame(state.now_playing, false);
  data.recently_played = state.recently_played.map((g) => exportGame(g, true));
  return data;
}
function base64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function styleParams() {
  const p = new URLSearchParams();
  if ($('theme').value !== 'dark') p.set('theme', $('theme').value);
  if ($('layout').value !== 'full') p.set('layout', $('layout').value);
  const accent = $('accent').value.replace('#', '');
  if (accent.toLowerCase() !== defaultAccent()) p.set('accent', accent);
  return p;
}
const ACCENTS = { dark: 'f472b6', light: 'db2777', neon: 'f15bb5', retro: 'ff8c42' };
const defaultAccent = () => ACCENTS[$('theme').value];

function quickUrl(data = exportData()) {
  const p = styleParams();
  p.set('data', base64url(JSON.stringify(data)));
  return `${ORIGIN}/api/card?${p}`;
}
function ghUrl(user) {
  const p = styleParams();
  p.set('user', user || 'your-username');
  return `${ORIGIN}/api/card?${p}`;
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const altText = () => (state.now_playing ? `Now playing: ${state.now_playing.title}` : 'My gitgamer card');
// Clicking an embedded card opens its hosted page, e.g. /card?user=someone.
const pageUrlFor = (cardUrl) => cardUrl.replace('/api/card?', '/card?');

function snippets(url) {
  const alt = altText();
  const page = pageUrlFor(url);
  return {
    md: `[![${alt.replace(/[[\]]/g, '')}](${url})](${page})`,
    html: `<a href="${escapeHtml(page)}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="100%" style="max-width:840px"></a>`,
  };
}

// ---------- rendering ----------
function gameRow(game, { actions = [], editable = false, recent = false } = {}) {
  const li = $('gameTpl').content.firstElementChild.cloneNode(true);
  const img = li.querySelector('.thumb');
  // Games from search carry a thumbnail; anything else (loaded from games.json, older drafts)
  // gets the same cover the card server uses. If there's none, show the placeholder.
  img.src = game.thumb || `/api/cover?${new URLSearchParams({ title: game.title, ...(game.wiki ? { wiki: game.wiki } : {}) })}`;
  img.onerror = () => { img.hidden = true; };
  li.querySelector('.title').textContent = game.title;
  li.querySelector('.desc').textContent = game.description || '';
  const controls = li.querySelector('.controls');
  if (editable) {
    const plat = li.querySelector('.platform');
    PLATFORMS.forEach((p) => plat.add(new Option(p || 'Platform…', p, false, p === (game.platform || ''))));
    plat.onchange = () => { game.platform = plat.value; changed(); };
    const status = li.querySelector('.status');
    if (recent) {
      STATUSES.forEach((s) => status.add(new Option(s, s, false, s === game.status)));
      status.onchange = () => { game.status = status.value; changed(); };
    } else status.remove();
  } else controls.replaceChildren();
  const box = li.querySelector('.actions');
  for (const [label, fn, cls] of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `small ${cls || ''}`;
    b.textContent = label;
    b.onclick = fn;
    box.append(b);
  }
  return li;
}

function renderLists() {
  $('username').value = state.username || '';
  const now = $('nowSlot');
  now.dataset.empty = 'Search above and pick “Now playing”.';
  now.replaceChildren();
  if (state.now_playing) {
    const ul = document.createElement('ul');
    ul.className = 'list';
    ul.append(gameRow(state.now_playing, {
      editable: true,
      actions: [
        ['Move to recent', () => { moveNowToRecent('Played'); changed(); }, 'ghost'],
        ['Remove', () => { state.now_playing = null; changed(); }, 'ghost'],
      ],
    }));
    now.append(ul);
  } else if (isEmpty()) {
    const p = document.createElement('p');
    p.className = 'empty-cta';
    p.append('Search above and pick “Now playing”, or ');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'small ghost';
    b.textContent = 'Try an example list';
    b.onclick = () => {
      const d = today();
      state.now_playing = { ...EXAMPLE.now_playing, started: d };
      state.recently_played = EXAMPLE.recently_played.map((g) => ({ ...g, ended: d }));
      changed();
    };
    p.append(b);
    now.append(p);
  }

  const list = $('recentList');
  list.dataset.empty = 'Nothing yet.';
  list.replaceChildren(...state.recently_played.map((g, i) => gameRow(g, {
    editable: true,
    recent: true,
    actions: [
      ['↑', () => { swap(i, i - 1); }, 'ghost'],
      ['↓', () => { swap(i, i + 1); }, 'ghost'],
      ['Play again', () => { const [g2] = state.recently_played.splice(i, 1); setNow(g2); }, 'ghost'],
      ['✕', () => { state.recently_played.splice(i, 1); changed(); }, 'ghost'],
    ],
  })));
}

function swap(i, j) {
  const r = state.recently_played;
  if (j < 0 || j >= r.length) return;
  [r[i], r[j]] = [r[j], r[i]];
  changed();
}

function moveNowToRecent(status) {
  if (!state.now_playing) return;
  state.recently_played.unshift({ ...state.now_playing, status, ended: today() });
  state.recently_played = state.recently_played.slice(0, 12);
  state.now_playing = null;
}

function setNow(game) {
  moveNowToRecent('Played');
  state.now_playing = { ...game, started: today(), status: undefined, ended: undefined };
  changed();
}

function addRecent(game) {
  state.recently_played.unshift({ ...game, status: 'Finished', ended: today() });
  state.recently_played = state.recently_played.slice(0, 12);
  changed();
}

let previewTimer;
function renderOutputs() {
  clearTimeout(previewTimer);
  const empty = isEmpty();
  const example = { ...EXAMPLE, username: state.username, now_playing: { ...EXAMPLE.now_playing, started: today() } };
  previewTimer = setTimeout(() => { $('preview').src = quickUrl(empty ? example : exportData()); }, 300);
  $('previewNote').hidden = !empty;
  document.querySelectorAll('.needs-games').forEach((el) => { el.hidden = empty; });
  document.querySelectorAll('.needs-games-hint').forEach((el) => { el.hidden = !empty; });

  const quick = snippets(quickUrl());
  $('mdQuick').value = quick.md;
  $('htmlQuick').value = quick.html;

  const user = validUsername(state.username) ? state.username : '';
  const gh = snippets(ghUrl(user));
  $('mdGh').value = gh.md;
  $('htmlGh').value = gh.html;

  renderShare();
}

// ---------- share on X ----------
const SITE = 'https://github.com/Josiassejod1/gitgamer';
// Local dev URLs aren't shareable, so point at the repo instead.
const SHARE_URL = ORIGIN.startsWith('http://localhost') ? SITE : ORIGIN;
const tweetUrl = (text, url) => `https://x.com/intent/tweet?${new URLSearchParams({ text, url })}`;

function renderShare() {
  const now = state.now_playing;
  const platform = now?.platform ? ` on ${now.platform}` : '';
  const text = now
    ? `🎮 Now playing: ${now.title}${platform}.\n\nMade my gamer card with gitgamer:`
    : '🎮 Made a gamer card for my GitHub profile with gitgamer. Show what you are playing, anywhere:';
  $('shareCard').href = tweetUrl(text, SHARE_URL);
}
$('shareTool').href = tweetUrl('🎮 gitgamer: show what you are playing on your GitHub profile, blog or site. Free and open source.', SHARE_URL);

function changed() {
  save();
  renderLists();
  renderOutputs();
}

// ---------- Wikipedia search (runs in the browser; Wikipedia allows CORS with origin=*) ----------
let searchTimer;
let searchSeq = 0;
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 350);
});

async function runSearch() {
  const q = $('search').value.trim();
  const seq = ++searchSeq;
  if (q.length < 2) { $('results').replaceChildren(); $('searchStatus').textContent = ''; return; }
  $('searchStatus').textContent = 'Searching Wikipedia…';
  const params = new URLSearchParams({
    origin: '*', action: 'query', format: 'json', formatversion: '2',
    generator: 'search', gsrsearch: `${q} video game`, gsrlimit: '8',
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '120', pilicense: 'any',
  });
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    const pages = ((await res.json()).query?.pages || []).sort((a, b) => a.index - b.index);
    if (seq !== searchSeq) return;
    const games = pages.map((p) => ({ title: p.title.replace(/ \((\d{4} )?video game\)$/, ''), wiki: p.title, description: p.description || '', thumb: p.thumbnail?.source || '' }));
    games.sort((a, b) => /video game/i.test(b.description) - /video game/i.test(a.description));
    $('searchStatus').textContent = games.length ? 'Results from Wikipedia' : 'No matches. Try the full title.';
    $('results').replaceChildren(...games.map((g) => gameRow(g, {
      actions: [
        ['Now playing', () => { setNow(g); clearSearch(); }],
        ['+ Recent', () => { addRecent(g); clearSearch(); }, 'ghost'],
      ],
    })));
  } catch {
    if (seq === searchSeq) $('searchStatus').textContent = 'Could not reach Wikipedia. Check your connection.';
  }
}
function clearSearch() {
  $('search').value = '';
  $('results').replaceChildren();
  $('searchStatus').textContent = '';
}

// ---------- import ----------
$('importBtn').onclick = async () => {
  const user = readUsername();
  if (!validUsername(user)) { $('searchStatus').textContent = 'Enter your GitHub username first.'; $('username').focus(); return; }
  $('searchStatus').textContent = `Loading ${user}/${user}/games.json…`;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${user}/${user}/HEAD/games.json`);
    if (!res.ok) throw new Error(res.status === 404 ? 'No games.json in that profile repo yet.' : `GitHub returned ${res.status}`);
    const data = await res.json();
    state = {
      username: user,
      now_playing: data.now_playing?.title ? { ...data.now_playing } : null,
      recently_played: Array.isArray(data.recently_played) ? data.recently_played.filter((g) => g?.title).slice(0, 12) : [],
    };
    $('searchStatus').textContent = 'Loaded!';
    changed();
  } catch (e) {
    $('searchStatus').textContent = e.message || 'Could not load that file.';
  }
};

// ---------- downloads ----------
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('dlJson').onclick = () => download(new Blob([JSON.stringify(exportData(), null, 2) + '\n'], { type: 'application/json' }), 'games.json');
$('dlSvg').onclick = async () => {
  $('dlStatus').textContent = 'Rendering…';
  const svg = await (await fetch(quickUrl())).text();
  download(new Blob([svg], { type: 'image/svg+xml' }), 'gitgamer.svg');
  $('dlStatus').textContent = '';
};
$('dlPng').onclick = async () => {
  $('dlStatus').textContent = 'Rendering…';
  try {
    const svg = await (await fetch(quickUrl())).text();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
    const scale = 2;
    const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth * scale, height: img.naturalHeight * scale });
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => { download(blob, 'gitgamer.png'); $('dlStatus').textContent = ''; }, 'image/png');
  } catch {
    $('dlStatus').textContent = 'PNG export failed in this browser. Download the SVG instead.';
  }
};

// ---------- wiring ----------
$('resetBtn').onclick = () => {
  if (!confirm('Clear your username and games and start over?')) return;
  try { localStorage.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
  state = { username: '', now_playing: null, recently_played: [] };
  ['username', 'search'].forEach((id) => { $(id).value = ''; });
  clearSearch();
  changed();
};
for (const id of ['theme', 'layout', 'accent']) $(id).addEventListener('input', () => {
  if (id === 'theme') $('accent').value = `#${defaultAccent()}`;
  renderOutputs();
});
$('username').addEventListener('input', () => {
  const value = readUsername();
  state.username = validUsername(value) ? value : '';
  save();
  renderOutputs();
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach((t) => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab); });
    document.querySelectorAll('.tabpanel').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  };
});
document.querySelectorAll('textarea[readonly]').forEach((t) => t.addEventListener('focus', () => t.select()));

// Show "used by N gamers" when this deployment has stats set up.
fetch('/api/stats')
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => {
    if (!s?.gamers) return;
    $('usedBy').textContent = ` · USED BY ${s.gamers.toLocaleString('en-US')} ${s.gamers === 1 ? 'GAMER' : 'GAMERS'}`;
    $('usedBy').hidden = false;
  })
  .catch(() => {});

renderLists();
renderOutputs();
