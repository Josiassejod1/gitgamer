import zlib from 'node:zlib';

// A tiny valid PNG so cover-art code paths run without the network.
export function tinyPng() {
  const w = 4, h = 6;
  const raw = Buffer.alloc((w * 3 + 1) * h, 0x80);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const n of buf) {
      c ^= n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

// Fake Wikipedia + GitHub. `files` maps raw.githubusercontent paths to JSON bodies.
// `redis` is an in-memory stand-in for Upstash's REST pipeline API (SADD / SCARD only).
export function mockFetch({ files = {}, calls = [], redis = null } = {}) {
  return async (input, opts = {}) => {
    const url = new URL(String(input));
    calls.push(url.href);
    if (url.hostname === 'redis.test') {
      if (!redis || redis.down) return new Response('down', { status: 500 });
      const results = JSON.parse(opts.body).map(([cmd, key, member]) => {
        redis.sets[key] ||= new Set();
        if (cmd === 'SADD') {
          const had = redis.sets[key].has(member);
          redis.sets[key].add(member);
          return { result: had ? 0 : 1 };
        }
        if (cmd === 'SCARD') return { result: redis.sets[key].size };
        return { error: `unsupported ${cmd}` };
      });
      return json(results);
    }
    if (url.hostname === 'en.wikipedia.org') {
      const p = url.searchParams;
      const name = p.get('titles') || p.get('gsrsearch').replace(/ video game$/, '');
      if (name === 'Nothing Matches') return json({ batchcomplete: true });
      return json({
        query: {
          pages: [
            { index: 1, title: `${name} (film)`, description: '2019 film', fullurl: 'https://en.wikipedia.org/wiki/film' },
            {
              index: 2,
              title: name,
              description: '2025 video game',
              fullurl: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`,
              pageimage: `${name.replace(/ /g, '_')}_cover.jpg`,
              thumbnail: { source: `https://upload.wikimedia.org/${encodeURIComponent(name)}.png` },
            },
          ],
        },
      });
    }
    if (url.hostname === 'upload.wikimedia.org') return new Response(tinyPng(), { headers: { 'content-type': 'image/png' } });
    if (url.hostname === 'raw.githubusercontent.com') {
      const body = files[url.pathname];
      return body === undefined ? new Response('404', { status: 404 }) : new Response(typeof body === 'string' ? body : JSON.stringify(body));
    }
    throw new Error(`Unexpected fetch in test: ${url.href}`);
  };
}

// Minimal req/res pair for calling the Vercel-style handlers directly.
export async function call(handler, path) {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(b) { this.body = String(b ?? ''); },
  };
  await handler({ url: path, headers: {} }, res);
  return res;
}
