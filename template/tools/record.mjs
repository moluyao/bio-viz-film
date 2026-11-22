// Deterministic frame recorder: the page exposes window.renderAt(t); we call it per frame and screenshot.
//   node record.mjs <siteDir> <out.mp4> [--fps 60] [--dpr 2] [--size 1080x1350] [--from 0 --to 31]
//   node record.mjs <siteDir> --stills 1,6,12 --stilldir out/stills      (PNG stills only)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
// --draft = quick preview (1x, 30 fps): ~1/8 of the full-quality render time
const DRAFT = args.includes('--draft'); if (DRAFT) args.splice(args.indexOf('--draft'), 1);
const FPS = Number(flag('fps', DRAFT ? 30 : 60)), DPR = Number(flag('dpr', DRAFT ? 1 : 2));
const [W, H] = String(flag('size', '1080x1350')).split('x').map(Number);
const SCALE = flag('scale', null), FROM = Number(flag('from', 0)), TO = flag('to', null), QUERY = flag('query', '');
const stills = flag('stills', null), stillDir = flag('stilldir', 'stills');
const [siteDir, outFile] = args;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const root = path.resolve(siteDir);
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html?record=1&dpr=${DPR}${QUERY ? '&' + QUERY : ''}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const DURATION = await page.evaluate(() => window.DURATION);
const cdp = await page.context().newCDPSession(page);
const CLIP = { x: 0, y: 0, width: W, height: H, scale: DPR };
const shot = async (fmt = 'jpeg') => Buffer.from((await cdp.send('Page.captureScreenshot', { format: fmt, quality: 95, optimizeForSpeed: true, clip: CLIP })).data, 'base64');
const frame = (t) => page.evaluate((tt) => { window.renderAt(tt); return new Promise((r) => requestAnimationFrame(() => r())); }, t);

const OVL = process.argv.includes('--overlay-dir') ? process.argv[process.argv.indexOf('--overlay-dir') + 1] : null;
if (OVL) { // UI layer only (transparent where the 3D goes), PNG per frame — to composite over externally rendered frames (Blender route)
  fs.mkdirSync(OVL, { recursive: true }); await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  const total = Math.round(DURATION * FPS);
  for (let f = 0; f < total; f++) { await frame(f / FPS); fs.writeFileSync(path.join(OVL, String(f).padStart(5, '0') + '.png'), await shot('png')); if (f % 48 === 0) process.stdout.write(`
overlay ${f}/${total}`); }
  console.log('overlay ->', path.resolve(OVL));
} else if (stills) {
  fs.mkdirSync(stillDir, { recursive: true });
  for (const s of stills.split(',').map(Number)) { await frame(s); fs.writeFileSync(path.join(stillDir, `t${s.toFixed(2).padStart(5, '0')}.png`), await shot('png')); }
  console.log('stills ->', path.resolve(stillDir));
} else {
  const end = TO != null ? Number(TO) : DURATION, total = Math.round((end - FROM) * FPS);
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  // one writer per output: a lock file with our PID; write to *.partial.mp4 and rename only when complete
  const OUT = path.resolve(outFile), LOCK = OUT + '.lock', PART = OUT.replace(/\.mp4$/i, '') + '.partial.mp4';
  if (fs.existsSync(LOCK)) { const pid = Number(fs.readFileSync(LOCK, 'utf8')); let alive = false; try { process.kill(pid, 0); alive = true; } catch {}
    if (alive) { console.error(`another recorder (pid ${pid}) is writing ${OUT}; stop it first`); process.exit(3); } }
  fs.writeFileSync(LOCK, String(process.pid));
  const cleanup = () => { try { fs.unlinkSync(LOCK); } catch {} };
  process.on('exit', cleanup); for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.on(sig, () => { try { ff && ff.kill('SIGKILL'); } catch {} try { fs.unlinkSync(PART); } catch {} cleanup(); process.exit(130); });
  var ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(SCALE ? ['-vf', `scale=${SCALE.replace('x', ':')}:flags=lanczos`] : []), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', PART], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await frame(FROM + f / FPS);
    if (!ff.stdin.write(await shot())) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) { const el = (Date.now() - t0) / 1000, eta = f ? el / f * (total - f) : 0; process.stdout.write(`\r${(f / FPS).toFixed(1)}s / ${(total / FPS).toFixed(1)}s  ${el.toFixed(0)}s elapsed  ETA ${(eta / 60).toFixed(1)} min  `); }
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  fs.renameSync(PART, OUT);
  // verify: decode every frame; any error means a corrupted file
  const { spawnSync } = await import('node:child_process'); const v = spawnSync('ffmpeg', ['-v', 'error', '-i', OUT, '-f', 'null', '-'], { encoding: 'utf8' });
  const nerr = (v.stderr || '').split(/\r?\n/).filter(Boolean).length; console.log('\nverify: ' + nerr + ' decode errors'); if (nerr) process.exitCode = 4;
  console.log('\nwrote', path.resolve(outFile));
}
console.log(problems.length ? 'problems:\n' + [...new Set(problems)].slice(0, 20).join('\n') : 'no page errors');
await browser.close(); server.close();
