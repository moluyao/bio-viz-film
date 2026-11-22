// Export a bio-viz-film scene for the Blender (Cycles) route.
//   node tools/export_blender.mjs site2 "story=thylakoid-en" out/blender/thylakoid [--fps 24] [--size 1080x1350]
// Writes: static.glb (all static non-bead meshes, incl. instancing), scene.json (bead models: molecule, LOD, matrices; palette; units),
//         frames.jsonl (per frame: camera, focus distance, cut height, dynamic pools, dynamic bead meshes).
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [siteDir = 'site2', query = '', outDir = 'out/blender/scene'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = Number(arg('--fps', 24)), [W, H] = arg('--size', '1080x1350').split('x').map(Number);
fs.mkdirSync(outDir, { recursive: true });
const root = path.resolve(siteDir), types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
const port = srv.address().port, br = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const pg = await br.newPage({ viewport: { width: W, height: H } }); pg.on('pageerror', (e) => console.log('pageerror', e.message));
await pg.goto(`http://localhost:${port}/index.html?${query}&record=1&dpr=1`); await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate(() => { window.__noRender = true; });
// ---- static part ----
const st = await pg.evaluate(async () => {
  const { GLTFExporter } = await import('./vendor/jsm/exporters/GLTFExporter.js');
  const { scene, THREE } = window.__dbg, ex = new THREE.Scene(), beads = [], skip = [], inst = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => { if (!o.isMesh) return;
    if (o.userData.bead) { const b = o.userData.bead; if (b.dyn) return; const mats = [];
      if (o.isInstancedMesh) { const m = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); mats.push(m.clone().premultiply(o.matrixWorld).elements.map((v) => +v.toFixed(4))); } }
      else mats.push(o.matrixWorld.elements.map((v) => +v.toFixed(4)));
      beads.push({ ...b, matrices: mats }); return; }
    if (o.userData.pool) return;
    if (o.isInstancedMesh && o.count === 0) return;
    const c = new THREE.Mesh(o.geometry);   // instanced meshes: prototype at identity + matrices in scene.json (rebuilt as GN instances in Blender)
    if (o.isInstancedMesh) { const mats = [], m = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); mats.push(m.clone().premultiply(o.matrixWorld).elements.map((v) => +v.toFixed(3))); } inst.push({ name: 'proto_' + ex.children.length, matrices: mats }); }
    const col = o.material.color ? o.material.color.getHexString() : 'ffffff';
    c.material = new THREE.MeshStandardMaterial({ color: '#' + col, vertexColors: !!o.material.vertexColors, roughness: o.material.roughness ?? 0.5 }); c.material.name = 'bv_' + col;
    c.matrixAutoUpdate = false; if (o.isInstancedMesh) { c.name = inst[inst.length - 1].name; } else { c.matrix.copy(o.matrixWorld); c.name = 'static_' + ex.children.length; } ex.add(c); });
  const glb = await new GLTFExporter().parseAsync(ex, { binary: true });
  const u8 = new Uint8Array(glb); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  const pools = []; scene.traverse((o) => { if (o.userData.pool) pools.push(o.userData.pool); });
  const dyn = []; scene.traverse((o) => { if (o.userData.bead && o.userData.bead.dyn) dyn.push(o.userData.bead); });
  return { glb: btoa(s), inst, beads, pools, dyn, palette: window.__world.palette, duration: window.DURATION, fog: null };
});
fs.writeFileSync(path.join(outDir, 'static.glb'), Buffer.from(st.glb, 'base64'));
const meta = { fps: FPS, size: [W, H], duration: st.duration, palette: st.palette, inst: st.inst, beads: st.beads, pools: st.pools, dyn: st.dyn, complexColor: { '5XNL': 'psii', '6RQF': 'b6f', '4XK8': 'psi', '6FKF': 'atp', '2BHW': 'lhcii', '1AG6': 'pc', '1A70': 'fd', '1FNB': 'fnr', '1RCX': 'rubisco' } };
fs.writeFileSync(path.join(outDir, 'scene.json'), JSON.stringify(meta));
console.log('static.glb', (fs.statSync(path.join(outDir, 'static.glb')).size / 1e6).toFixed(1), 'MB · bead groups', st.beads.length, '· bead instances', st.beads.reduce((a, b) => a + b.matrices.length, 0));
// ---- per-frame part ----
if (process.argv.includes('--static-only')) { await br.close(); srv.close(); process.exit(0); }
const N = Math.round(st.duration * FPS), out = fs.createWriteStream(path.join(outDir, 'frames.jsonl'));
for (let f = 0; f < N; f++) {
  const fr = await pg.evaluate((t) => { window.renderAt(t); const { scene, cam } = window.__dbg, r = (v) => +v.toFixed(4);
    const pools = {}; scene.traverse((o) => { if (o.userData.pool) { const a = []; for (let i = 0; i < o.count; i++) a.push(Array.from(o.instanceMatrix.array.slice(i * 16, i * 16 + 16)).map(r)); pools[o.userData.pool.kind] = a; } });
    const dyn = {}; scene.traverse((o) => { if (o.userData.bead && o.userData.bead.dyn) { o.updateMatrixWorld(true); dyn[o.userData.bead.dyn] = o.matrixWorld.elements.map(r); } });
    const v = cam.view; return { t, cam: { p: cam.position.toArray().map(r), q: cam.quaternion.toArray().map(r), fov: cam.fov, near: cam.near, far: cam.far, offY: v && v.enabled ? v.offsetY / v.fullHeight : 0, offX: v && v.enabled ? v.offsetX / v.fullWidth : 0 },
      fd: r(window.__fd), cut: r(window.__cutZ), slab: window.__slab > 1e3 ? null : r(window.__slab), pools, dyn }; }, f / FPS);
  out.write(JSON.stringify(fr) + '\n'); if (f % 120 === 0) process.stdout.write(`\rframe ${f}/${N}`);
}
out.end(); await new Promise((r) => out.on('finish', r)); console.log(`\nframes.jsonl ${N} frames`); await br.close(); srv.close();
