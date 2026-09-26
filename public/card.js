// The page a card links to: the card, the games on it (linked to Wikipedia), and a "make your own" nudge.
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SOURCES = ['user', 'repo', 'path', 'gist', 'data', 'playing', 'platform', 'name', 'since'];
const STYLE = ['theme', 'accent', 'layout', 'recent'];

const source = new URLSearchParams();
for (const key of [...SOURCES, ...STYLE]) if (params.get(key)) source.set(key, params.get(key));
if (![...source.keys()].some((k) => SOURCES.includes(k))) location.replace('/');

$('card').src = `/api/card?${source}`;

const safeLink = (url) => (typeof url === 'string' && /^https?:\/\//.test(url) ? url : '');

function gameItem(game, label) {
  const li = document.createElement('li');
  li.className = 'game';
  const img = document.createElement('img');
  img.className = 'thumb';
  img.alt = '';
  img.src = `/api/cover?${new URLSearchParams({ title: game.title, ...(game.wikipedia?.title ? { wiki: game.wikipedia.title } : {}) })}`;
  img.onerror = () => { img.hidden = true; };
  const meta = document.createElement('div');
  meta.className = 'meta';
  const title = document.createElement('strong');
  title.className = 'title';
  title.textContent = game.title;
  const desc = document.createElement('span');
  desc.className = 'desc';
  desc.textContent = [label, game.platform, game.status].filter(Boolean).join(' · ');
  meta.append(title, desc);
  li.append(img, meta);
  const link = safeLink(game.wikipedia?.url) || safeLink(game.link);
  if (link) {
    const a = document.createElement('a');
    a.className = 'btn ghost small-btn';
    a.href = link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = safeLink(game.wikipedia?.url) ? 'Wikipedia ↗' : 'More ↗';
    li.append(a);
  }
  return li;
}

try {
  const json = new URLSearchParams(source);
  json.set('format', 'json');
  json.set('recent', '5');
  const res = await fetch(`/api/card?${json}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load this card');

  const who = data.username ? `@${data.username}` : data.name;
  $('heading').textContent = who ? `What ${who} is playing` : 'Now playing';
  document.title = who ? `${who}'s gitgamer card` : 'gitgamer card';
  $('card').alt = data.now_playing ? `Now playing: ${data.now_playing.title}` : 'gitgamer card';

  const items = [];
  if (data.now_playing) items.push(gameItem(data.now_playing, 'Now playing'));
  for (const g of data.recently_played || []) items.push(gameItem(g, 'Recently played'));
  $('games').replaceChildren(...items);
  $('gamesHeading').hidden = !items.length;

  const text = data.now_playing
    ? `🎮 ${who || 'Someone'} is playing ${data.now_playing.title}. Make your own gamer card with gitgamer:`
    : '🎮 Make your own gamer card with gitgamer:';
  $('share').href = `https://x.com/intent/tweet?${new URLSearchParams({ text, url: location.href })}`;
} catch (e) {
  $('error').textContent = e.message;
  $('error').hidden = false;
}
