// Overlap check: node tools/check.mjs site2 "story=thylakoid-en"  → prints world.check() (bead-level intersections between molecules)
import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || 'site2'), query = process.argv[3] || '';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const port = srv.address().port, br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const pg = await br.newPage({ viewport: { width: 540, height: 675 } }); pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${port}/index.html?${query}&t=0&layout=clean`); await pg.waitForFunction(() => window.__ready, null, { timeout: 600000 });
console.log(JSON.stringify(await pg.evaluate(() => (window.__world.check ? window.__world.check() : 'no check()')), null, 1)); await br.close(); srv.close();
