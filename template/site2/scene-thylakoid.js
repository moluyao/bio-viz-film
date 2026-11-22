// Scene: chloroplast → granum → thylakoid membrane with REAL protein structures (bead models from PDB/OPM), light reactions.
// 1 unit = 1 nm. World frame: chloroplast long axis x, thylakoid discs parallel to x–z (stacked along y), section plane z = cut.
// Protein frame (OPM): membrane normal z, LUMEN at +z (checked: PSII Mn cluster +2.5, PSI Fe-S −3.2, ATP synthase head −8.8, cyt f +4.8).
// Bead data: site2/mol/<PDB>.json from tools/pdb2beads.py (fine 0.6 nm / coarse 1.4 nm voxels; cls 0 protein 1 chlorophyll 2 carotenoid 3 lipid/other 5 metal).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { V, UP, ease, win, clamp01, Builder, Pool, fbm, gridGeometry, keepify, capify, flipWinding, GEO } from './lib.js';

const IDS = ['5XNL', '6RQF', '4XK8', '6FKF', '2BHW', '1AG6', '1A70', '1FNB', '1RCX'];
const MOL = Object.fromEntries(await Promise.all(IDS.map(async (id) => [id, await (await fetch(`./mol/${id}.json`)).json()])));

export const PALETTE = {
  envelope: '#b8e08a', stroma: '#eef6de', thyl: '#5fc46a', lumen: '#d8f5c8', grana2: '#7fd38a',
  psii: '#1fa37a', lhcii: '#9be36b', b6f: '#ff9a3c', psi: '#2f7cf6', atp: '#9b5cff', rotor: '#ff4fa0', rubisco: '#ffd8a8', ribo: '#ff9fb8',
  chl: '#2bd94a', car: '#ff8a1e', metal: '#ff2a2a', pc: '#28c8ff', fd: '#e84393', fnr: '#c9a0ff', pq: '#ffe14a',
  photon: '#fff35c', exciton: '#fffbd0', electron: '#ffe600', proton: '#ff3b6b', o2: '#3aa0ff', water: '#8fd8ff', atpMol: '#ff7a00', nadph: '#00d1b2',
  starch: '#f4eedf', plasto: '#ffe07a',
};
const COMPLEX = { '5XNL': 'psii', '6RQF': 'b6f', '4XK8': 'psi', '6FKF': 'atp', '2BHW': 'lhcii', '1AG6': 'pc', '1A70': 'fd', '1FNB': 'fnr', '1RCX': 'rubisco' };

export function build(scene, seed) {
  const b = new Builder(scene, seed), R = b.R, rr = (a, c) => a + (c - a) * R();
  const col = (k) => new THREE.Color(PALETTE[k]);
  const M = {};
  const mat = (k, o = {}) => (M[k] = keepify(capify(b.mat(PALETTE[k], o))));
  ['envelope', 'thyl', 'starch', 'plasto', 'grana2'].forEach((k) => mat(k));
  const CUTU = { value: 1e6 }; globalThis.__beadCut = CUTU;
  const mkBeadMat = (inst) => { const m = b.mat('#ffffff', { vertexColors: true, roughness: 0.5, clearcoat: 0.15, sheen: 0.25 }); m.clipping = false; m.clippingPlanes = [];
    m.onBeforeCompile = (sh) => { sh.uniforms.uBeadCut = CUTU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCtr; varying float vCtrZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (inst ? 'vCtrZ = (modelMatrix * instanceMatrix * vec4(aCtr, 1.0)).z;' : 'vCtrZ = (modelMatrix * vec4(aCtr, 1.0)).z;'));
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uBeadCut; varying float vCtrZ;').replace('#include <clipping_planes_fragment>', 'if (vCtrZ > uBeadCut) discard;\n#include <clipping_planes_fragment>'); };
    m.customProgramCacheKey = () => 'bead' + (inst ? 'I' : 'M'); return m; };
  const beadMat = mkBeadMat(true), beadMatM = mkBeadMat(false);
  const glow = (k, ei = 1.6) => (M[k] = b.mat(PALETTE[k], { emissive: PALETTE[k], emissiveIntensity: ei, roughness: 0.3 }));
  ['photon', 'exciton', 'electron', 'proton'].forEach((k) => glow(k)); glow('atpMol', 1.0); glow('nadph', 1.0); glow('o2', 0.6); glow('water', 0.3);

  // ---------- bead geometry from structure data ----------
  const ICO = [0, 1].map((d) => { const g = new THREE.IcosahedronGeometry(1, d); g.deleteAttribute('uv'); return g; });
  function beadGeo(beads, det, base, sel) {
    const ico = ICO[det], ip = ico.attributes.position.array, inn = ico.attributes.normal.array, nv = ip.length / 3;
    const list = sel ? beads.filter(sel) : beads, pos = new Float32Array(list.length * nv * 3), nor = new Float32Array(pos.length), cl = new Float32Array(pos.length), ctr = new Float32Array(pos.length);
    const cBase = col(base), cChl = col('chl'), cCar = col('car'), cMet = col('metal'), c = new THREE.Color();
    list.forEach((bd, i) => { const [x, y, z, r, k] = bd; c.copy(k === 1 ? cChl : k === 2 ? cCar : k === 5 ? cMet : cBase);
      if (k === 0) { const j = 0.9 + 0.2 * ((i * 2654435761 >>> 0) % 1000) / 1000; c.multiplyScalar(j); }
      for (let v = 0; v < nv; v++) { const o = (i * nv + v) * 3; pos[o] = x + ip[v * 3] * r; pos[o + 1] = y + ip[v * 3 + 1] * r; pos[o + 2] = z + ip[v * 3 + 2] * r;
        { const l = Math.hypot(ip[v * 3], ip[v * 3 + 1], ip[v * 3 + 2]); nor[o] = ip[v * 3] / l; nor[o + 1] = ip[v * 3 + 1] / l; nor[o + 2] = ip[v * 3 + 2] / l; } ctr[o] = x; ctr[o + 1] = y; ctr[o + 2] = z; cl[o] = c.r; cl[o + 1] = c.g; cl[o + 2] = c.b; } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.setAttribute('aCtr', new THREE.BufferAttribute(ctr, 3)); return g;
  }
  const GEOC = {}, GEOF = {};
  for (const id of IDS) { GEOC[id] = beadGeo(MOL[id].coarse, 0, COMPLEX[id]); }
  // membrane frame: OPM (X,Y,Z; lumen +Z) → world. lumenDir = ±1 (world y direction of the lumen), θ = rotation in the membrane plane
  const frame = (p, lumenDir, th) => { const Zw = V(0, lumenDir, 0), Xw = V(Math.cos(th), 0, Math.sin(th)), Yw = V().crossVectors(Zw, Xw); return new THREE.Matrix4().makeBasis(Xw, Yw, Zw).setPosition(p); };
  const instAdd = new Map(); // id|lod -> matrices
  const put = (id, m, lod = 'c') => { const k = id + '|' + lod; if (!instAdd.has(k)) instAdd.set(k, []); instAdd.get(k).push(m); };

  // ---------- chloroplast ----------
  const CA = [3000, 1050, 1750];
  const inChl = (p, s = 1) => (p.x / (CA[0] * s)) ** 2 + (p.y / (CA[1] * s)) ** 2 + (p.z / (CA[2] * s)) ** 2;
  const ellShell = (a, th, nu = 160, nv = 320) => { const g = gridGeometry(nu, nv, (u, v) => { const t = u * Math.PI, f = v * Math.PI * 2, n = V(Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f));
      const w = 1 + 0.012 * (fbm(n.x * 3, n.y * 3, n.z * 3) - 0.5); return { p: V(a[0] * n.x * w, a[1] * n.y * w, a[2] * n.z * w), k: 1 }; }, true);
    g.computeVertexNormals(); const inner = g.clone(), pa = inner.attributes.position.array, nr = g.attributes.normal;
    for (let i = 0; i < nr.count; i++) { pa[i * 3] += nr.getX(i) * th; pa[i * 3 + 1] += nr.getY(i) * th; pa[i * 3 + 2] += nr.getZ(i) * th; } inner.computeVertexNormals(); return mergeGeometries([flipWinding(g.clone()), inner]); };
  b.mesh(ellShell(CA, 5), M.envelope); b.mesh(ellShell(CA.map((a) => a - 20), 5), M.envelope);   // outer + inner envelope membrane (~10-20 nm apart)

  // ---------- grana + stroma lamellae ----------
  const REP = 20, HO = 8, MID = 6;   // stacking repeat 20 nm; disc half-thickness 8 nm; membrane mid-planes at ±6 nm (lumen ~8 nm, membrane ~4 nm)
  const discGeo = (() => { // closed flattened sac (lathe profile), as a 4 nm thick membrane shell → capified section shows two membranes + lumen
    const prof = (h, R0) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 10; pts.push(new THREE.Vector2(R0 + h * Math.cos(a), h * Math.sin(a))); } return [new THREE.Vector2(0, -h), ...pts, new THREE.Vector2(0, h)]; };
    const o = new THREE.LatheGeometry(prof(HO, 100 - HO), 96), i2 = flipWinding(new THREE.LatheGeometry(prof(HO - 4, 100 - HO), 96)); o.deleteAttribute('uv'); i2.deleteAttribute('uv');
    // lathe axis = y (stack axis) ✓
    return mergeGeometries([o, i2]); })();
  const grana = [], starch = [V(-1500, 120, -300), V(1600, -200, 500)].map((c, k) => ({ c, a: [520 - 80 * k, 260, 320] }));
  const inStarch = (p, m = 0) => starch.some((s) => ((p.x - s.c.x) / (s.a[0] + m)) ** 2 + ((p.y - s.c.y) / (s.a[1] + m)) ** 2 + ((p.z - s.c.z) / (s.a[2] + m)) ** 2 < 1);
  const HERO = { c: V(260, 0, -40), R: 230, n: 14 };   // hero granum (centre z −40 so the section at z = 0 cuts through it)
  grana.push(HERO);
  for (let k = 0; k < 4000 && grana.length < 46; k++) {
    const c = V(rr(-2500, 2500), rr(-500, 500), rr(-1350, 1350)), Rg = rr(170, 270), n = Math.round(rr(7, 19)), h = n * REP / 2;
    if (inChl(V(Math.abs(c.x) + Rg, Math.abs(c.y) + h, Math.abs(c.z)), 1) > 0.78 || inChl(V(Math.abs(c.x), Math.abs(c.y) + h, Math.abs(c.z) + Rg)) > 0.78) continue;
    if (inStarch(c, Rg + 60)) continue;
    if (grana.some((g) => Math.hypot(g.c.x - c.x, g.c.z - c.z) < g.R + Rg + 120 && Math.abs(g.c.y - c.y) < (g.n + n) * REP / 2 + 60)) continue;
    grana.push({ c, R: Rg, n });
  }
  const discItems = []; grana.forEach((g) => { for (let i = 0; i < g.n; i++) discItems.push({ p: V(g.c.x, g.c.y + (i - (g.n - 1) / 2) * REP, g.c.z), s: V(g.R / 100, 1, g.R / 100) }); });
  const discMesh = b.inst(discGeo, M.thyl, discItems, 0.06);
  // stroma lamellae: flat sacs linking neighbouring grana at a disc level (simplified from the helical arrangement)
  const lam = [];
  grana.forEach((g, gi) => { const nb = grana.map((h, hi) => [hi, Math.hypot(h.c.x - g.c.x, h.c.z - g.c.z)]).filter(([hi, d]) => hi > gi && d < 1100).sort((a, c) => a[1] - c[1]).slice(0, 2);
    nb.forEach(([hi]) => { const h = grana[hi], y = (g.c.y + h.c.y) / 2 + rr(-40, 40); const a = V(g.c.x, y, g.c.z), c = V(h.c.x, y, h.c.z), d = c.clone().sub(a), L = d.length();
      lam.push({ a, c, w: rr(90, 150), L, ang: Math.atan2(d.z, d.x) }); }); });
  const lamGeo = (() => { const o = new THREE.BoxGeometry(1, 2 * HO, 1, 1, 1, 1), i2 = flipWinding(new THREE.BoxGeometry(1, 2 * HO - 8, 0.94, 1, 1, 1)); o.deleteAttribute('uv'); i2.deleteAttribute('uv'); return mergeGeometries([o.toNonIndexed(), i2.toNonIndexed()]); })();
  b.inst(lamGeo, M.thyl, lam.map((l) => ({ p: l.a.clone().add(l.c).multiplyScalar(0.5), s: V(l.L, 1, l.w), q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -l.ang) })), 0.05);
  starch.forEach((s) => { const m = b.mesh(new THREE.IcosahedronGeometry(1, 5), M.starch); m.scale.set(...s.a); m.position.copy(s.c); });
  const plast = []; for (let k = 0; k < 3000 && plast.length < 45; k++) { const p = V(rr(-2600, 2600), rr(-800, 800), rr(-1500, 1500)), r = rr(20, 45);
    if (inChl(p) > 0.8 || inStarch(p, 80) || grana.some((g) => Math.hypot(g.c.x - p.x, g.c.z - p.z) < g.R + r + 15 && Math.abs(g.c.y - p.y) < g.n * REP / 2 + r + 15)) continue; plast.push({ p, s: r }); }
  b.inst(GEO.s3, M.plasto, plast, 0.1);
  const inThyl = (p, m) => grana.some((g) => Math.hypot(g.c.x - p.x, g.c.z - p.z) < g.R + m && Math.abs(g.c.y - p.y) < g.n * REP / 2 + m)
    || lam.some((l) => { const d = l.c.clone().sub(l.a), t = clamp01(p.clone().sub(l.a).dot(d) / d.lengthSq()), q = l.a.clone().addScaledVector(d, t); return Math.abs(p.y - l.a.y) < HO + m && Math.hypot(p.x - q.x, p.z - q.z) < l.w / 2 + m; });

  // ---------- hero granum: real complexes on its membranes near the section ----------
  const discY = (i) => HERO.c.y + (i - (HERO.n - 1) / 2) * REP;   // i = n-1 is the top disc (stroma above it)
  const TOP = HERO.n - 1, yTop = discY(TOP);
  const memb = []; // {y, lumenDir, appressed}
  for (let i = 0; i < HERO.n; i++) { memb.push({ y: discY(i) + MID, lumenDir: -1, app: i < TOP, disc: i }); memb.push({ y: discY(i) - MID, lumenDir: 1, app: i > 0, disc: i }); }
  const FOOT = { '5XNL': 15.5, '6RQF': 6.2, '4XK8': 9.2, '6FKF': 6.8, '2BHW': 4.2 };
  const placed = []; // {id, m, p, y, r, ld}
  // bead-level collision grid: a molecule is only placed if none of its coarse beads intersects an already placed molecule
  const BG = new Map(), BC = 3, bv = V();
  const beadsW = (id, m) => MOL[id].coarse.map((bd) => { bv.set(bd[0], bd[1], bd[2]).applyMatrix4(m); return [bv.x, bv.y, bv.z, bd[3]]; });
  const bgHit = (ws, tol = 0.2) => ws.some(([x, y, z, r]) => { const cx = Math.floor(x / BC), cy = Math.floor(y / BC), cz = Math.floor(z / BC);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const a = BG.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (a) for (const o of a) if (Math.hypot(x - o[0], y - o[1], z - o[2]) < r + o[3] - tol) return true; } return false; });
  const bgAdd = (ws) => ws.forEach((w) => { const k = Math.floor(w[0] / BC) + ',' + Math.floor(w[1] / BC) + ',' + Math.floor(w[2] / BC); if (!BG.has(k)) BG.set(k, []); BG.get(k).push(w); });
  const lumFoot = (id) => (id === '5XNL' ? 11 : id === '6RQF' ? 5 : 0);
  const tryPlace = (id, mb, x, z, th) => { const r = FOOT[id]; if (Math.hypot(x - HERO.c.x, z - HERO.c.z) > HERO.R - r - 6) return false;
    for (const q of placed) { if (q.mb === mb && Math.hypot(q.x - x, q.z - z) < q.r + r + 0.8) return false;
      if (q.disc === mb.disc && q.mb !== mb && lumFoot(q.id) && lumFoot(id) && Math.hypot(q.x - x, q.z - z) < lumFoot(q.id) + lumFoot(id)) return false; }
    const m = frame(V(x, mb.y, z), mb.lumenDir, th), ws = beadsW(id, m); if (bgHit(ws)) return false; bgAdd(ws); placed.push({ id, mb, disc: mb.disc, x, z, r, m, th }); return m; };
  // hero complexes (the electron path): PSII + b6f in the appressed bottom membrane of the top disc; PSI + ATP synthase in its stroma-facing top membrane
  const mBot = memb[TOP * 2 + 1], mTopM = memb[TOP * 2], hx = HERO.c.x;
  const H = { psii: tryPlace('5XNL', mBot, hx - 46, -1.5, 0.25), b6f: tryPlace('6RQF', mBot, hx - 12, -0.5, 0.6), psi: tryPlace('4XK8', mTopM, hx + 14, -1, 1.1), atp: tryPlace('6FKF', mTopM, hx + 52, -1.5, 0.4) };
  const heroIdx = new Set(placed.map((q, i) => i));
  // fill: appressed → PSII supercomplexes + LHCII trimers + some b6f; non-appressed (top membrane of the top disc) → PSI, ATP synthase, b6f, LHCII
  memb.forEach((mb) => { const band = mb.disc >= HERO.n - 4 ? [-78, 6] : [-26, 6], tries = mb.app ? 900 : 700;
    for (let k = 0; k < tries; k++) { const z = rr(band[0], band[1]) + HERO.c.z * 0, x = HERO.c.x + rr(-HERO.R, HERO.R), th = rr(0, Math.PI * 2), u = R();
      const id = mb.app ? (u < 0.5 ? '5XNL' : u < 0.9 ? '2BHW' : '6RQF') : (u < 0.45 ? '4XK8' : u < 0.7 ? '6FKF' : u < 0.85 ? '6RQF' : '2BHW');
      tryPlace(id, mb, x, z, th); } });
  // plain lipid-only bands are left between complexes (real grana are ~70-80% protein by area)
  placed.forEach((q, i) => put(q.id, q.m, heroIdx.has(i) ? 'f' : 'c'));

  // other grana: simplified single-blob complexes in the membranes near the section (wide-shot texture only)
  const blobs = { psii: [], psi: [] };
  grana.slice(1).forEach((g) => { for (let i = 0; i < g.n; i++) for (const s of [1, -1]) { const y = g.c.y + (i - (g.n - 1) / 2) * REP + s * MID, nonApp = (s === 1 && i === g.n - 1) || (s === -1 && i === 0);
    for (let k = 0; k < g.R * 0.09; k++) { const x = g.c.x + rr(-g.R, g.R), z = rr(-22, 4); if (Math.hypot(x - g.c.x, z - g.c.z) > g.R - 12) continue;
      (nonApp ? blobs.psi : blobs.psii).push({ p: V(x, y, z), s: V(rr(5, 7), 3.2, rr(5, 7)) }); } } });
  b.inst(GEO.s2, b.mat(PALETTE.psii, { roughness: 0.6 }), blobs.psii, 0.25); b.inst(GEO.s2, b.mat(PALETTE.psi, { roughness: 0.6 }), blobs.psi, 0.25);

  // stroma: Rubisco everywhere near the section (≈ 2.7×10⁻⁴ nm⁻³ ≈ 0.45 mM); real bead models near the hero, single blobs elsewhere; some 70S ribosomes
  const rub = [], rubF = [], ribo = [];
  for (let k = 0; k < 420000 && rub.length < 60000; k++) { const p = V(rr(-CA[0], CA[0]), rr(-CA[1], CA[1]), rr(-70, 4)); if (inChl(p, 0.985) > 1 || inStarch(p, 8) || inThyl(p, 9)) continue;
    const nearHero = Math.abs(p.x - hx) < 160 && p.y > yTop + HO + 20 && p.y < yTop + 170 && p.z > -60; if (nearHero && Math.hypot(p.x - hx - 52, p.y - yTop) < 34) continue;
    if (nearHero) rubF.push(p); else if (R() < 0.97) rub.push({ p, s: 5.4 }); else ribo.push({ p, s: 10 }); }
  b.inst(GEO.s1, b.mat(PALETTE.rubisco, { roughness: 0.6 }), rub, 0.2); b.inst(GEO.s2, b.mat(PALETTE.ribo, { roughness: 0.6 }), ribo, 0.2);
  // near-hero Rubisco with real shape (no overlaps: 11 nm spacing)
  const rubKeep = []; for (const p of rubF) { if (!rubKeep.every((q) => q.distanceToSquared(p) > 64)) continue; const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(0, 6), rr(0, 6), rr(0, 6))), V(1, 1, 1)), ws = beadsW('1RCX', m);
    if (bgHit(ws)) continue; bgAdd(ws); rubKeep.push(p); put('1RCX', m, 'c'); }
  const rubTarget = rubKeep.length ? rubKeep.reduce((a2, p) => (p.distanceTo(V(hx + 30, yTop + 30, 0)) < a2.distanceTo(V(hx + 30, yTop + 30, 0)) ? p : a2), rubKeep[0]).clone() : V(hx + 30, yTop + 40, -4);

  // build instanced meshes per complex/LOD (hero = fine beads; ATP synthase hero is split into stator + rotor)
  const atpRotorGeo = beadGeo(MOL['6FKF'].fine, 1, 'rotor', (bd) => bd[5] === 1), atpStatorGeo = beadGeo(MOL['6FKF'].fine, 1, 'atp', (bd) => bd[5] !== 1);
  for (const [k, ms] of instAdd) { const [id, lod] = k.split('|'); if (id === '6FKF' && lod === 'f') continue;
    const geo = lod === 'f' ? (GEOF[id] ||= beadGeo(MOL[id].fine, 1, COMPLEX[id])) : GEOC[id];
    const im = new THREE.InstancedMesh(geo, beadMat, ms.length); ms.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; im.userData.bead = { mol: id, lod }; scene.add(im); }
  const atpStator = new THREE.Mesh(atpStatorGeo, beadMatM); atpStator.matrixAutoUpdate = false; atpStator.matrix.copy(H.atp); atpStator.userData.bead = { mol: '6FKF', lod: 'f', grp: 0 }; scene.add(atpStator);
  const atpRotor = new THREE.Mesh(atpRotorGeo, beadMatM); atpRotor.matrixAutoUpdate = false; atpRotor.userData.bead = { mol: '6FKF', lod: 'f', grp: 1, dyn: 'rotor' }; scene.add(atpRotor);
  const rotC = (() => { const r = MOL['6FKF'].fine.filter((bd) => bd[5] === 1); let x = 0, y = 0; r.forEach((bd) => { x += bd[0]; y += bd[1]; }); return [x / r.length, y / r.length]; })();

  // ---------- process actors ----------
  const W = (m, p) => V(...p).applyMatrix4(m);                       // OPM point (nm) → world
  const site = (id, nm, i = 0) => MOL[id].side_info.sites[nm][i];
  const psiiOEC = W(H.psii, site('5XNL', 'OEX', 0)), psiiQB = W(H.psii, site('5XNL', 'PL9', 0)), psiiRC = psiiOEC.clone().lerp(psiiQB, 0.55);
  const b6fQo = W(H.b6f, site('6RQF', 'PL9', 1)), b6fCytf = W(H.b6f, site('6RQF', 'HEC', 1)), psiSF4 = W(H.psi, site('4XK8', 'SF4', 2)), psiLum = W(H.psi, [0, 0, 3.2]);
  const atpIn = W(H.atp, [rotC[0] + 4.2, rotC[1], 1.2]), atpOut = W(H.atp, [rotC[0] + 4.2, rotC[1], -2.4]), atpHead = W(H.atp, [0.5, 0.5, -15.5]);
  // pigments of the hero PSII (for exciton hops) — beads of class 1 in the fine model, ordered from the outer antenna to the RC
  const chl = MOL['5XNL'].fine.filter((bd) => bd[4] === 1).map((bd) => W(H.psii, bd));
  const hop = []; { let cur = chl.reduce((a, p) => (p.distanceTo(psiiRC) > a.distanceTo(psiiRC) && p.x < psiiRC.x ? p : a), chl[0]); hop.push(cur);
    for (let s = 0; s < 14; s++) { const nxt = chl.filter((p) => p.distanceTo(psiiRC) < cur.distanceTo(psiiRC) - 0.6 && p.distanceTo(cur) < 2.6).sort((a, c) => a.distanceTo(cur) - c.distanceTo(cur))[0]; if (!nxt) break; hop.push(nxt); cur = nxt; } hop.push(psiiRC); }
  const chlPSI = MOL['4XK8'].fine.filter((bd) => bd[4] === 1).map((bd) => W(H.psi, bd)), psiRC = W(H.psi, [0, 0, 0.5]);
  const lumY = yTop;  // lumen mid-plane of the top disc
  const fnrM = new THREE.Matrix4().compose(W(H.psi, [6, 8, -9.5]), new THREE.Quaternion(), V(1, 1, 1)); put('1FNB', fnrM, 'f');
  const fnrSite = V(...[0, 0, 0]).applyMatrix4(fnrM);
  { const im = new THREE.InstancedMesh(beadGeo(MOL['1FNB'].fine, 1, 'fnr'), beadMat, 1); im.setMatrixAt(0, fnrM); im.frustumCulled = false; im.userData.bead = { mol: '1FNB', lod: 'f', color: 'fnr' }; scene.add(im); }
  const mkMol = (id, k) => { const m = new THREE.Mesh(beadGeo(MOL[id].fine, 1, k), beadMatM); m.frustumCulled = false; m.userData.bead = { mol: id, lod: 'f', dyn: k, color: k }; scene.add(m); return m; };
  const pcMesh = mkMol('1AG6', 'pc'), fdMesh = mkMol('1A70', 'fd');
  const P = { ph: new Pool(scene, new THREE.CylinderGeometry(0.25, 0.25, 1, 8).rotateX(Math.PI / 2), M.photon, 4), ex: new Pool(scene, GEO.s2, M.exciton, 4), e: new Pool(scene, GEO.s2, M.electron, 12),
    hp: new Pool(scene, GEO.s1, M.proton, 120), o2: new Pool(scene, GEO.s2, M.o2, 8), w: new Pool(scene, GEO.s2, M.water, 24), pq: new Pool(scene, GEO.s1, b.mat(PALETTE.pq, { emissive: PALETTE.pq, emissiveIntensity: 0.4 }), 12),
    atp: new Pool(scene, GEO.s2, M.atpMol, 60), nad: new Pool(scene, GEO.s2, M.nadph, 20) };
  for (const k of ['e', 'ex', 'ph', 'hp']) { P[k].m.material.depthTest = false; P[k].m.renderOrder = 10; }
  for (const [k, p] of Object.entries(P)) p.m.userData.pool = { kind: k, color: '#' + p.m.material.color.getHexString(), emissive: p.m.material.emissiveIntensity || 0, shape: k === 'ph' ? 'rod' : 'sphere' };
  const pathPt = (pts, u) => { u = clamp01(u) * (pts.length - 1); const i = Math.min(pts.length - 2, Math.floor(u)); return pts[i].clone().lerp(pts[i + 1], u - i); };
  const wob = (s, t) => V(Math.sin(t * 3.1 + s) * 0.5, Math.sin(t * 2.3 + s * 1.7) * 0.25, Math.cos(t * 2.7 + s * 0.6) * 0.5);
  const ROT_TURN = 2.6; // s per 360° in film time (14 H⁺ per turn → 3 ATP)
  const rotAngle = (t, T) => (t < T.atp[0] ? 0 : (t - T.atp[0]) / ROT_TURN * Math.PI * 2 * Math.min(1, (t - T.atp[0]) / 1.2 + 0.0));
  function census(t, T) {
    const r = (a, b) => win(t, a, b), phI = Math.round(4 * r(T.ph1[0], T.water[1])) + Math.round(4 * r(T.ph2[0], T.eFd[1])), e = Math.round(4 * r(T.eRC[0], T.eFd[1])), o2 = t > T.water[1] ? 1 : 0;
    const hp = Math.round(4 * r(T.water[1] - 0.3, T.water[1] + 0.6)) + Math.round(8 * r(T.qo[0], T.qo[1] + 1)), nad = Math.round(2 * r(T.fnr[0], T.fnr[1] + 0.8)), atpF = 12 / 14 * 3 * r(T.atp[0], T.atp[0] + 6);
    const turns = Math.max(0, rotAngle(t, T) / (Math.PI * 2)), hThru = Math.floor(turns * 14), atpR = Math.floor(turns * 3);
    return { photons: phI, electrons: e, o2, hp, nadph: nad, atp: atpF.toFixed(1), atpRing: atpR, hThru, turns: turns.toFixed(2), hFrac: hp / 12, complexes: placed.length };
  }
  function update(t, T) {
    Object.values(P).forEach((p) => p.begin());
    // photon 1 → LHCII antenna of the hero PSII, exciton hops chlorophyll to chlorophyll to the reaction centre
    const shot = (pp, win0, to) => { if (t < win0[0] || t > win0[1]) return; const u = ease(win(t, win0[0], win0[1])), from = to.clone().add(V(-30, 60, 40)), p = from.clone().lerp(to, u); P.ph.add(p, V(1.8, 1.8, 9), to.clone().sub(from).normalize()); };
    shot(0, T.ph1, hop[0]); shot(1, T.ph2, chlPSI[0] || psiRC);
    if (t > T.ph1[1] && t < T.exc[1]) { const u = win(t, T.exc[0], T.exc[1]); P.ex.add(pathPt(hop, u), 1.1 + 0.25 * Math.sin(t * 30)); }
    if (t > T.ph2[1] && t < T.ph2[1] + 0.8) P.ex.add((chlPSI[0] || psiRC).clone().lerp(psiRC, win(t, T.ph2[1], T.ph2[1] + 0.8)), 1.1);
    // water splitting at the Mn4CaO5 cluster (lumen side): 2 H2O in → O2 out, 4 H⁺ into the lumen; electrons to the RC → QB
    const wIn = (k) => psiiOEC.clone().add(V(-6 + 3 * k, -2.5, 6 - 2 * k));
    if (t > T.water[0] - 1.2 && t < T.water[1]) for (let k = 0; k < 2; k++) { const p = wIn(k).lerp(psiiOEC, ease(win(t, T.water[0] - 1.2, T.water[0] + 0.6))); P.w.add(p, 0.45); P.w.add(p.clone().add(V(0.36, 0.24, 0)), 0.26); P.w.add(p.clone().add(V(-0.36, 0.24, 0)), 0.26); }
    if (t > T.water[1] - 0.4) { const u = ease(win(t, T.water[1] - 0.4, T.water[1] + 2.5)), p = psiiOEC.clone().add(V(-10 * u, 1.5 * u, 8 * u)); if (u < 1) { P.o2.add(p, 0.6); P.o2.add(p.clone().add(V(0.5, 0, 0)), 0.6); } }
    const hpRel = [];   // H⁺ released into the lumen (water: 4, Qo: 2)
    if (t > T.water[1] - 0.3) for (let k = 0; k < 4; k++) hpRel.push([psiiOEC, T.water[1] - 0.3 + k * 0.15, k]);
    if (t > T.qo[1] - 0.3) for (let k = 0; k < 2; k++) hpRel.push([b6fQo, T.qo[1] - 0.3 + k * 0.2, k + 4]);
    for (const [o, t0, k] of hpRel) { const age = t - t0; if (age < 0) continue; const ang = k * 2.4, d = Math.min(14, 6 * Math.sqrt(age)); const p = o.clone().add(V(Math.cos(ang) * d, 0, Math.sin(ang) * d * 0.6)); p.y = lumY + Math.sin(age * 3 + k) * 1.6; P.hp.add(p, 0.62); }
    // electron path: OEC → RC → QB; PQH2 diffuses in the membrane to b6f (Qo); cyt f → plastocyanin → PSI; PSI → Fd → FNR → NADPH
    const eDot = (p) => P.e.add(p, 0.85);
    if (t > T.eRC[0] && t < T.eQB) eDot(t < T.eRC[1] ? psiiOEC.clone().lerp(psiiRC, ease(win(t, ...T.eRC))) : psiiRC.clone().lerp(psiiQB, ease(win(t, T.eRC[1], T.eQB))));
    if (t > T.eRC[0] + 1.2 && t < T.eQB + 1.2) eDot(psiiOEC.clone().lerp(psiiQB, ease(win(t, T.eRC[0] + 1.2, T.eQB + 1.2))));   // 2nd electron (PQ needs 2)
    const stromaB = psiiQB.clone(); stromaB.y = yTop - HO - 2;   // stromal gap below the appressed membrane
    for (let k = 0; k < 2; k++) { const t0 = T.eQB + 0.4 + k * 0.4; if (t > t0 && t < T.pq[0]) P.hp.add(stromaB.clone().add(V(-1.5 + 3 * k, -1, 1)).lerp(psiiQB, ease(win(t, t0, t0 + 1.2))), 0.62); }
    if (t > T.fnr[0] - 1 && t < T.fnr[1]) P.hp.add(fnrSite.clone().add(V(4, 6, 2)).lerp(fnrSite, ease(win(t, T.fnr[0] - 1, T.fnr[1]))), 0.62);
    const pqP = t < T.pq[0] ? psiiQB : psiiQB.clone().lerp(b6fQo, ease(win(t, ...T.pq)));
    if (t > T.eQB - 0.2 && t < T.qo[1]) for (let k = 0; k < 5; k++) P.pq.add(pqP.clone().add(V((k - 2) * 0.42, 0, Math.sin(k) * 0.2)).add(t > T.pq[0] ? wob(0, t).multiplyScalar(0.3) : V()), 0.26);
    if (t > T.qo[1] && t < T.ePC[0]) eDot(b6fQo.clone().lerp(b6fCytf, ease(win(t, T.qo[1], T.ePC[0]))));
    const pcDock = b6fCytf.clone().add(V(1.5, 2.8, 0)), pcPSI = psiLum.clone().add(V(0, -2.6, 0)), pcStart = pcDock.clone().add(V(-6, 0.5, 4));
    const pcPos = t < T.ePC[0] - 1 ? pcStart.clone().lerp(pcDock, ease(win(t, T.ePC[0] - 2.5, T.ePC[0] - 1))) : pcDock.clone().lerp(pcPSI, ease(win(t, T.ePC[0], T.ePC[1])));
    pcMesh.position.copy(pcPos); pcMesh.position.y = Math.min(Math.max(pcMesh.position.y, lumY - 1.2), lumY + 1.2); pcMesh.rotation.set(t * 0.3, t * 0.2, 0);
    if (t > T.ePC[0] - 0.2 && t < T.ePC[1] + 0.3) eDot(pcMesh.position.clone().add(V(0, 0.6, 0)));
    if (t > T.ePC[1] + 0.3 && t < T.eFd[0]) eDot(psiLum.clone().lerp(psiSF4, ease(win(t, T.ePC[1] + 0.3, T.eFd[0]))));
    const fdDock = psiSF4.clone().add(V(0, 3.0, 0)), fdStart = fdDock.clone().add(V(-7, 4, 3));
    const fdPos0 = (tt) => fdDock.clone().lerp(fnrSite.clone().add(V(-3, 1.5, 0)), ease(win(tt - 0.6, ...T.eFd)));
    const fdPos = t < T.eFd[0] ? fdStart.clone().lerp(fdDock, ease(win(t, T.eFd[0] - 2, T.eFd[0]))) : fdDock.clone().lerp(fnrSite.clone().add(V(-3, 1.5, 0)), ease(win(t, ...T.eFd)));
    fdMesh.position.copy(fdPos); fdMesh.rotation.set(0.4, t * 0.25, 0.2);
    if (t > T.eFd[0] && t < T.eFd[1]) eDot(fdPos.clone().add(V(0, 0.7, 0)));
    if (t > T.fnr[1] - 0.2) { const u = ease(win(t, T.fnr[1] - 0.2, T.fnr[1] + 2.5)), w2 = ease(win(t, T.recap[0], T.recap[1]));
      for (let n = 0; n < 2; n++) { const p0 = fnrSite.clone().add(V(4 * u + n * 3, 8 * u, -2 * u)), p = p0.lerp(rubTarget.clone().add(V(-4 + n * 3, -6, 0)), w2); for (let k = 0; k < 4; k++) P.nad.add(p.clone().add(V(k * 0.75 - 1.1, Math.sin(k) * 0.4, 0)), 0.55); } }
    // ATP synthase: rotor turns as H⁺ pass from lumen to stroma (14 H⁺ per turn); CF1 releases 3 ATP per turn
    const ang = rotAngle(t, T); const rot = new THREE.Matrix4().makeTranslation(rotC[0], rotC[1], 0).multiply(new THREE.Matrix4().makeRotationZ(ang)).multiply(new THREE.Matrix4().makeTranslation(-rotC[0], -rotC[1], 0));
    atpRotor.matrix.copy(H.atp).multiply(rot);
    if (t > T.atp[0]) { const per = ROT_TURN / 14; for (let k = 0; k < 14; k++) { const t0 = T.atp[0] + Math.floor((t - T.atp[0]) / per - k) * per; if (t0 < T.atp[0]) continue; const u = (t - t0) / (per * 6); if (u > 1) continue;
        P.hp.add(u < 0.5 ? atpIn.clone().add(V(0, 3 * (0.5 - u) * 2, 0)).lerp(atpIn, 0) .add(V(0, 0, 0)) : atpIn.clone().lerp(atpOut, (u - 0.5) * 2), 0.3); }
      const nA = Math.floor((t - T.atp[0]) / (ROT_TURN / 3)); for (let k = Math.max(0, nA - 6); k <= nA; k++) { const t0 = T.atp[0] + k * ROT_TURN / 3 + ROT_TURN / 3, age = t - t0; if (age < 0 || age > 3.2) continue;
        const a = k * 2.09, p = atpHead.clone().add(V(Math.cos(a) * (2.5 + 1.6 * age), 1 + 2.2 * age, Math.sin(a) * (2.5 + 1.6 * age))); for (let j = 0; j < 3; j++) P.atp.add(p.clone().add(V(j * 0.8 - 0.8, 0, 0)), 0.55); } }
      const w3 = ease(win(t, T.recap[0], T.recap[1])); if (w3 > 0) for (let n = 0; n < 3; n++) { const p = atpHead.clone().add(V(4 - n * 3, 6, n)).lerp(rubTarget.clone().add(V(3 + n * 3, -5, 1)), w3); for (let j = 0; j < 3; j++) P.atp.add(p.clone().add(V(j * 0.8 - 0.8, 0, 0)), 0.55); }
    Object.values(P).forEach((p) => p.end());
  }
  const anchors = { chloroplast: V(0, 0, 0), granum: HERO.c.clone().setZ(-10), stack: V(hx, yTop - 60, -8), membrane: V(hx - 10, yTop, -10), psii: psiiRC.clone(), oec: psiiOEC.clone(), b6f: b6fQo.clone(), psi: psiRC.clone(),
    atp: atpHead.clone().lerp(atpIn, 0.5), fnr: fnrSite.clone(), stroma: rubTarget.clone().lerp(atpHead, 0.5), lumen: V(hx - 15, lumY, -10) };
  anchors.e = (t, T) => (t < T.qo[1] ? (t < T.eQB ? psiiRC.clone() : psiiQB.clone().lerp(b6fQo, ease(win(t, ...T.pq)))) : t < T.ePC[1] ? b6fCytf.clone().lerp(psiLum, ease(win(t, ...T.ePC))) : psiSF4.clone().lerp(fnrSite, ease(win(t, ...T.eFd))));
  anchors.pc = (t, T) => pcMesh.position.clone();
  // overlap check: every coarse bead of every placed complex + near-hero Rubisco; pairs from different molecules closer than (r1+r2)−tol
  function check(tol = 0.35) {
    const items = []; placed.forEach((q, i) => items.push({ id: q.id, m: q.m, tag: 'c' + i })); rubKeep.forEach((p, i) => items.push({ id: '1RCX', m: instAdd.get('1RCX|c')[i], tag: 'r' + i }));
    const cell = 3, grid = new Map(), v = V(); let pairs = 0, worst = 0; const byKind = {};
    items.forEach((it, n) => { for (const bd of MOL[it.id].coarse) { v.set(bd[0], bd[1], bd[2]).applyMatrix4(it.m); const key = [Math.floor(v.x / cell), Math.floor(v.y / cell), Math.floor(v.z / cell)];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const a = grid.get((key[0] + dx) + ',' + (key[1] + dy) + ',' + (key[2] + dz)); if (!a) continue;
        for (const o of a) { if (o.n === n) continue; const pen = bd[3] + o.r - tol - Math.hypot(v.x - o.x, v.y - o.y, v.z - o.z); if (pen > 0) { pairs++; worst = Math.max(worst, pen); const k = [it.id, items[o.n].id].sort().join('-'); byKind[k] = (byKind[k] || 0) + 1; } } }
      const k0 = key.join(','); if (!grid.has(k0)) grid.set(k0, []); grid.get(k0).push({ x: v.x, y: v.y, z: v.z, r: bd[3], n }); } });
    // membranes: protein beads must not poke through the OTHER membrane of the same disc or a neighbouring disc (checked via y vs. membrane planes)
    return { molecules: items.length, overlappingBeadPairs: pairs, worstNm: +worst.toFixed(2), byKind };
  }
  return { check, anchors, update, census, palette: PALETTE, setPalette: () => {}, stats: { grana: grana.length, complexes: placed.length, rubisco: rub.length + rubKeep.length } };
}
