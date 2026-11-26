import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(root) || !['.js', '.css', '.html'].includes(path.extname(target))) { res.writeHead(404).end(); return; }
    const data = await readFile(target); res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404).end(); }
}).listen(4174, '127.0.0.1', () => console.log('Demo: http://127.0.0.1:4174/demo/index.html'));
