import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright-core';
const [siteDir, t, px, py, query = ''] = process.argv.slice(2); const root = path.resolve(siteDir);
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`http://127.0.0.1:${server.address().port}/index.html?record=1&dpr=1&${query}`); await pg.waitForFunction(() => window.__ready);
console.log(await pg.evaluate(([t, x, y]) => { window.renderAt(t); const { scene, cam, THREE, W, H } = window.__dbg; const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(x / W * 2 - 1, -(y / H * 2 - 1)), cam); const hits = rc.intersectObjects(scene.children, false).filter((h) => h.point.z < 0.8).slice(0, 6);
  return hits.map((h) => `${h.object.type} geo=${h.object.geometry.type} mat=#${h.object.material.color?.getHexString()} op=${h.object.material.opacity} d=${h.distance.toFixed(2)} p=${h.point.toArray().map((v) => v.toFixed(2))}`).join('\n'); }, [Number(t), Number(px), Number(py)]));
await b.close(); server.close();
