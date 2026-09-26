// Local dev server: serves public/ and routes /api/* to the same handlers Vercel runs.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import card from './api/card.js';
import picks from './api/picks.js';

const PUBLIC = path.join(path.dirname(new URL(import.meta.url).pathname), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const routes = { '/api/card': card, '/api/picks': picks };

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (routes[pathname]) return routes[pathname](req, res);
  const file = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`gitgamer running at http://localhost:${port}`));
