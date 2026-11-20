import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright-core';
const [siteDir, t, px, py, query = ''] = process.argv.slice(2); const root = path.resolve(siteDir);
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`http://127.0.0.1:${server.address().port}/index.html?record=1&dpr=1&layout=clean&${query}`); await pg.waitForFunction(() => window.__ready);
console.log(await pg.evaluate(([t, x, y]) => { const { scene } = window.__dbg; const cv = document.querySelector('canvas'); const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d');
  const px = () => { window.renderAt(t); g.drawImage(cv, 0, 0); return Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3)); };
  const base = px(); const out = ['base ' + base];
  scene.children.forEach((o, i) => { if (!o.isMesh && !o.isInstancedMesh) return; o.visible = false; const p = px(); o.visible = true; const d = Math.abs(p[0] - base[0]) + Math.abs(p[1] - base[1]) + Math.abs(p[2] - base[2]);
    if (d > 12) out.push(`${i} ${o.type} ${o.geometry.type} #${o.material.color.getHexString()} transparent=${o.material.transparent} count=${o.count} -> ${p}`); });
  return out.join('\n'); }, [Number(t), Number(px), Number(py)]));
await b.close(); server.close();
