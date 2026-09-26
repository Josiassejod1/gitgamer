import { escapeXml as x, truncate, formatDate } from './util.js';

export const SITE_LABEL = 'www.gitgamer.com';

export const THEMES = {
  dark: { bg1: '#0d1117', bg2: '#1e1147', border: '#30363d', title: '#f0f6fc', text: '#e6edf3', muted: '#9da7b3', faint: '#6e7681', accent: '#f472b6', live: '#22c55e', section: '#a78bfa' },
  light: { bg1: '#ffffff', bg2: '#f3efff', border: '#d0d7de', title: '#1f2328', text: '#24292f', muted: '#57606a', faint: '#8c959f', accent: '#db2777', live: '#16a34a', section: '#7c3aed' },
  neon: { bg1: '#05010f', bg2: '#0a2a2f', border: '#00f5d4', title: '#fdfdfd', text: '#e0fbfc', muted: '#9bf6ff', faint: '#5e8b95', accent: '#f15bb5', live: '#00f5d4', section: '#fee440' },
  retro: { bg1: '#2b1d0e', bg2: '#3d2914', border: '#8a6a3f', title: '#ffe8b0', text: '#ffe8b0', muted: '#d9b77e', faint: '#a88b5c', accent: '#ff8c42', live: '#9bdb4d', section: '#ffcf56' },
};

const FONT = `'Segoe UI',Ubuntu,Helvetica,Arial,sans-serif`;

export function resolveTheme(name, accent) {
  const theme = { ...(THEMES[name] || THEMES.dark) };
  if (/^[0-9a-f]{6}$/i.test(accent || '')) theme.accent = `#${accent}`;
  return theme;
}

function wrap(text, max, lines) {
  const out = [];
  let cur = '';
  for (const word of text.split(/\s+/)) {
    if (cur && (cur + ' ' + word).length > max) {
      out.push(cur);
      cur = word;
    } else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = truncate(out[lines - 1] + ' …', max);
  }
  return out.map((l) => truncate(l, max));
}

const initials = (t) =>
  t.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

function cover(uri, title, box, id, t) {
  const { x: X, y: Y, w, h, r } = box;
  if (uri) {
    return `<clipPath id="${id}"><rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${r}"/></clipPath>` +
      `<image href="${uri}" x="${X}" y="${Y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
      `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${t.border}"/>`;
  }
  return `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${r}" fill="url(#ph)"/>` +
    `<text x="${X + w / 2}" y="${Y + h / 2 + w / 9}" text-anchor="middle" font-size="${Math.round(w / 3)}" font-weight="800" fill="#ffffffcc">${x(initials(title))}</text>`;
}

function frame(W, H, t, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${x(label)}">
<title>${x(label)}</title>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
<linearGradient id="ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#db2777"/></linearGradient>
<style>text{font-family:${FONT}}.l{font-size:12px;font-weight:700;letter-spacing:2px}</style>
</defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#bg)" stroke="${t.border}"/>
${body}
</svg>
`;
}

const liveDot = (cx, cy, t) =>
  `<circle cx="${cx}" cy="${cy}" r="5" fill="${t.live}"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>`;

// card: { name, now: {title, platform, started, coverUri}, recent: [{title, platform, status, coverUri}] }
export function renderCard(card, opts = {}) {
  const t = resolveTheme(opts.theme, opts.accent);
  const compact = opts.layout === 'compact';
  const now = card.now;
  const player = card.username ? `@${card.username}` : card.name;
  const who = card.username ? `@${card.username} · ` : card.name ? `${card.name.toUpperCase()} · ` : '';
  const label = now ? `${player ? player + ' is playing' : 'Now playing'}: ${now.title}` : 'Gaming card';
  const parts = [];

  const W = compact ? 500 : 840;
  const recent = compact ? [] : card.recent.slice(0, Math.max(0, Math.min(5, opts.recent ?? 5)));
  const H = compact ? 180 : recent.length ? 300 : 240;
  const coverBox = compact ? { x: 20, y: 20, w: 105, h: 140, r: 8 } : { x: 24, y: 52, w: 156, h: 208, r: 10 };
  if (!compact && !recent.length) Object.assign(coverBox, { y: 44, w: 132, h: 176 });
  const tx = coverBox.x + coverBox.w + 20;
  const titleChars = compact ? 24 : 34;
  const titleSize = compact ? 22 : 26;

  if (!compact) parts.push(`<text x="24" y="32" class="l" fill="${t.accent}">${x(who)}PLAYER 1</text>`);

  if (now) {
    parts.push(cover(now.coverUri, now.title, coverBox, 'c0', t));
    const top = compact ? 44 : coverBox.y + 14;
    parts.push(liveDot(tx + 6, top - 4, t), `<text x="${tx + 18}" y="${top + 1}" class="l" fill="${t.live}">NOW PLAYING</text>`);
    const lines = wrap(now.title, titleChars, 2);
    lines.forEach((line, i) =>
      parts.push(`<text x="${tx}" y="${top + 36 + i * (titleSize + 4)}" font-size="${titleSize}" font-weight="700" fill="${t.title}">${x(line)}</text>`),
    );
    const metaY = top + 36 + (lines.length - 1) * (titleSize + 4) + 26;
    const meta = [now.platform, formatDate(now.started) && `since ${formatDate(now.started)}`].filter(Boolean).join('  ·  ');
    if (meta) parts.push(`<text x="${tx}" y="${metaY}" font-size="14" fill="${t.muted}">${x(meta)}</text>`);
  } else {
    parts.push(cover('', '?', coverBox, 'c0', t), `<text x="${tx}" y="${coverBox.y + 60}" font-size="20" font-weight="700" fill="${t.title}">Nothing in the console right now</text>`);
  }

  if (recent.length) {
    parts.push(`<text x="${tx}" y="196" class="l" fill="${t.section}">RECENTLY PLAYED</text>`);
    // Fewer games get wider slots, so titles aren't cut short when there's room.
    const slot = Math.min(Math.floor((W - tx - 16) / recent.length), 280);
    const chars = Math.max(10, Math.floor((slot - 60) / 7));
    recent.forEach((g, i) => {
      const gx = tx + i * slot;
      parts.push(
        cover(g.coverUri, g.title, { x: gx, y: 206, w: 44, h: 58, r: 5 }, `r${i}`, t),
        `<text x="${gx + 52}" y="222" font-size="12" font-weight="600" fill="${t.text}">${x(truncate(g.title, chars))}</text>`,
        `<text x="${gx + 52}" y="238" font-size="11" fill="${t.faint}">${x(truncate(g.status, chars + 2))}</text>`,
        `<text x="${gx + 52}" y="252" font-size="11" fill="${t.faint}">${x(truncate(g.platform, chars + 2))}</text>`,
      );
    });
  }

  parts.push(
    `<text x="${compact ? 20 : 24}" y="${H - 12}" font-size="11" font-weight="700" letter-spacing=".5" fill="${t.accent}">${SITE_LABEL}</text>`,
    `<text x="${W - 16}" y="${H - 12}" text-anchor="end" font-size="10" fill="${t.faint}">Game info &amp; art: Wikipedia</text>`,
  );
  return frame(W, H, t, label, parts.join('\n'));
}

export function renderError(message, opts = {}) {
  const t = resolveTheme(opts.theme);
  return frame(500, 110, t, 'gitgamer error',
    `<text x="24" y="44" class="l" fill="${t.accent}">GITGAMER</text>` +
    `<text x="24" y="76" font-size="14" fill="${t.text}">${x(truncate(message, 64))}</text>`);
}

// Small shields-style badge, e.g. "🎮 used by | 250 gamers".
export function renderBadge(label, message) {
  const width = (s) => Math.round([...s].reduce((w, ch) => w + (ch.codePointAt(0) > 0x2000 ? 14 : 6.6), 0)) + 16;
  const lw = width(label);
  const mw = width(message);
  const W = lw + mw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="20" role="img" aria-label="${x(`${label} ${message}`)}">
<title>${x(`${label} ${message}`)}</title>
<clipPath id="r"><rect width="${W}" height="20" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#2d2f3a"/><rect x="${lw}" width="${mw}" height="20" fill="#db2777"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="14">${x(label)}</text><text x="${lw + mw / 2}" y="14" font-weight="bold">${x(message)}</text>
</g>
</svg>
`;
}
