// v3 scene: pancreatic acinar cell at TRUE proportions and EM-faithful morphology (no simplification).
// 1 scene unit = 0.5 µm. Reference dimensions (EM / histology; see references/morphology-acinar.md):
//   cell height ~15 µm (wedge: base ~11 µm, apex ~3.5 µm) · nucleus Ø ~6 µm, basal, prominent nucleolus
//   RER: parallel cisternae, lumen ~50–60 nm, repeat ~0.2–0.25 µm, polysomes on the cytosolic faces, continuous with the outer nuclear membrane
//   Golgi: supranuclear stacks of ~6 cisternae, Ø 1–1.5 µm, lumen ~25 nm, repeat ~55 nm, dilated fenestrated rims, cis faces the ER, TGN tubules on trans
//   condensing vacuoles Ø ~1.5–2 µm · zymogen granules Ø ~1 µm, crowd the apical third · mitochondria Ø ~0.5 µm, 1.5–3 µm long, lamellar cristae
//   ribosome Ø ~25 nm · COPII/COPI/TGN vesicles Ø 60–100 nm · microtubule Ø 25 nm · microvilli Ø ~0.1 µm · NPC Ø ~120 nm
//   cells form an acinus (rosette) around a central lumen; secretion is apical only
import * as THREE from 'three';
import { V, UP, fib, Builder, Pool, GEO, ease, win, clamp01, fbm, gridGeometry, bentCapsule, keepify } from './lib.js';

export const PALETTE = {
  pm: '#9db8d8', envelope: '#7586e6', chromatin: '#8a6cd6', nucleolus: '#5b43b5', er: '#2fb5a5', ribosome: '#f06a96',
  golgi: '#f2914c', vesicle: '#f7c58e', granuleM: '#b896ea', vacuole: '#d9c2f5', mitoOut: '#ff7a63', mitoIn: '#cf4f3a',
  mt: '#78d2e6', cyto: '#7f8daa', mrna: '#ffffff', tracer: '#ffe27a', cargo: '#d9c9a3', signal: '#62f0ff', translocon: '#c8f56a',
  lyso: '#7d5d93', perox: '#a9c46c', tj: '#e8eef8', envelopeIn: '#5d6ccc', actin: '#6fae94',
};
// true pyramidal acinar cell: lateral faces converge on the lumen axis (wedge ~38° → 9–10 cells per acinus), small apical surface
const LX = 15, LUMX = 16.6, hOf = (x) => { const w = 0.345 * (LUMX - x); return Math.sqrt(w * w + 1.7 * 1.7) - 0.15; };
const inF = (p) => { const h = hOf(p.x); return (Math.abs(p.y) / h) ** 4 + (Math.abs(p.z) / h) ** 4 + (Math.abs(p.x) / LX) ** 10; }; // <1 inside the cell
const radAt = (x, c, s) => { const e = 1 - (Math.abs(x) / LX) ** 10; return e <= 0 ? 0 : hOf(x) * Math.pow(e / (Math.abs(c) ** 4 + Math.abs(s) ** 4), 0.25); };
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const FIBC = {}; const fibC = (n) => (FIBC[n] ||= fib(n));
function capify(m, k = 0.78) { // cut faces of closed solids render as flat "section" caps (like an EM section), not hollow shells
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader
    .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n if (!gl_FrontFacing) { normal = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz); }')
    .replace('#include <color_fragment>', `#include <color_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb *= ${k.toFixed(2)};`); };
  m.customProgramCacheKey = () => 'cap' + k; return m;
}
function riboGeo(det) { // 80S: large + small subunit (Ø ~25 nm)
  const a = new THREE.IcosahedronGeometry(0.026, det), b = new THREE.IcosahedronGeometry(0.019, det); b.translate(0, 0, 0.026); b.scale(1.15, 0.9, 1);
  const cat = (k) => { const x = a.attributes[k].array, y = b.attributes[k].array, o = new Float32Array(x.length + y.length); o.set(x); o.set(y, x.length); return o; };
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cat('position'), 3)); g.setAttribute('normal', new THREE.BufferAttribute(cat('normal'), 3)); return g;
}

export function build(scene, seed = 5) {
  const hero = new THREE.Group(); scene.add(hero);
  const B = new Builder(hero, seed), rr = (a, b) => B.rr(a, b), R = B.R;
  const C = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, new THREE.Color(v)]));
  const mat = (k, o = {}, cap) => { const m = B.mat(C[k], o); return cap ? capify(m, cap) : m; };
  const M = {
    pm: mat('pm', { roughness: 0.5 }), envelope: mat('envelope'), envelopeIn: mat('envelopeIn', {}, 0.7), chromatin: mat('chromatin', { roughness: 0.7 }), nucleolus: mat('nucleolus', { roughness: 0.7 }),
    er: mat('er'), ribosome: mat('ribosome', { roughness: 0.55 }), golgi: mat('golgi'), vesicle: mat('vesicle', {}, 0.8),
    granule: mat('granuleM', { roughness: 0.45 }, 0.82), vacuole: mat('vacuole', { roughness: 0.5 }, 0.72), mitoOut: mat('mitoOut', { roughness: 0.5 }, 0.85), mitoIn: mat('mitoIn', {}, 0.8),
    cristae: mat('mitoIn'), mt: mat('mt', { roughness: 0.3 }), cyto: mat('cyto', { roughness: 0.75, clearcoat: 0 }), mrna: mat('mrna'), cargo: mat('cargo'),
    lyso: mat('lyso', {}, 0.7), perox: mat('perox', {}, 0.75), tj: mat('tj'), translocon: mat('translocon', { emissive: C.translocon, emissiveIntensity: 0.7 }),
    tracer: B.mat(C.tracer, { emissive: C.tracer, emissiveIntensity: 2.2 }), signal: B.mat(C.signal, { emissive: C.signal, emissiveIntensity: 1.2 }),
  };
  M.erK = keepify(mat('er')); M.golgiK = keepify(mat('golgi')); /* thin sheets: no section caps */ M.envK = keepify(mat('envelope')); M.pmK = keepify(mat('pm', { roughness: 0.5 })); M.actin = mat('actin', { roughness: 0.4 });
  const DEN = (globalThis.__bvOpts && globalThis.__bvOpts.density) || 1;
  const anchors = {};
  const RIBO = riboGeo(1), RIBO_HI = riboGeo(3);

  // ======================= layout =======================
  const N = V(-7.5, 0, -0.2), NR = 6;
  const KN = 5, R0 = 6.45, DR = 0.45, LH = 0.055;                       // RER cisternae radii around the nucleus, lumen half-width
  const und = (d) => 0.32 * (fbm(d.x * 2.3 + 3.1, d.y * 2.3, d.z * 2.3) - 0.5);   // shared undulation → parallel stacks
  const Rk = (k, d) => R0 + k * DR + und(d) + 0.05 * (fbm(d.x * 5 + k * 1.7, d.y * 5, d.z * 5) - 0.5);
  const maxDx = (k) => (k < 2 ? 0.12 : k < 6 ? 0.55 : 0.35);
  const stacks = [
    { G: V(-1.5, -3.9, 0.15), R: 1.4 }, { G: V(0.4, -0.6, 0.05), R: 1.3 }, { G: V(-0.6, 2.9, -0.15), R: 1.35 },
  ];
  for (const s of stacks) { s.a = s.G.clone().sub(N).setZ(0).normalize(); s.b1 = V().crossVectors(s.a, UP).normalize(); s.b2 = V().crossVectors(s.a, s.b1); }
  const GK = 6, GSP = 0.11, gOff = (k) => (k - (GK - 1) / 2) * GSP, gRad = (s, k) => s.R * (1 - 0.1 * Math.abs(k - 2.5) / 2.5);
  const gBulge = (r) => -0.32 * (1 - r * r);
  const gPt = (s, k, rho, phi, dn = 0) => { const r = gRad(s, k) * rho; return s.G.clone().addScaledVector(s.a, gOff(k) + gBulge(rho) + dn).addScaledVector(s.b1, Math.cos(phi) * r).addScaledVector(s.b2, Math.sin(phi) * r); };
  // hero route
  const dD = V(0.25, -0.96, 0.1315).normalize(), dE = V(0.55, -0.83, 0.06).normalize(), kH = 2;
  const sheetN = (d) => d.clone(); // outward normal of a cisterna ≈ radial
  const Dm = N.clone().addScaledVector(dD, Rk(kH, dD) + LH), Dc = Dm.clone().addScaledVector(dD, 0.035);
  const tD = V().crossVectors(UP, dD).normalize().negate();
  const F = Dc.clone().addScaledVector(dD, 0.16).addScaledVector(tD, 0.24);
  const Em = N.clone().addScaledVector(dE, Rk(kH, dE) + LH);
  const lumAt = (d) => N.clone().addScaledVector(d, Rk(kH, d));
  const S1 = stacks[0], Pcis = gPt(S1, 0, 0.55, Math.PI * 1.05, -0.03), nCis = S1.a.clone().negate();
  const Ptr = gPt(S1, GK - 1, 0.6, Math.PI * 1.1, 0.03), nTr = S1.a.clone();
  const CV0 = Ptr.clone().addScaledVector(nTr, 1.9); CV0.z = 0.15; const rCV = 1.55, rG = 0.88;
  for (let i = 0; i < 40 && [V(0, 1, 0), V(0, -1, 0), V(1, 0, 0)].some((d) => inF(CV0.clone().addScaledVector(d, rCV + 0.35)) > 0.92); i++) { CV0.y *= 0.95; CV0.x += 0.08; }
  // apical fusion site
  const apexPt = (y, z) => { let lo = 8, hi = LX; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (inF(V(m, y, z)) < 1) lo = m; else hi = m; } return V(lo, y, z); };
  const gradF = (p) => { const e = 0.01, f0 = inF(p); return V(inF(V(p.x + e, p.y, p.z)) - f0, inF(V(p.x, p.y + e, p.z)) - f0, inF(V(p.x, p.y, p.z + e)) - f0).normalize(); };
  const S = apexPt(-0.25, 0.4), nOut = gradF(S), nIn = nOut.clone().negate(), RP = 1.25;
  const cvRoute = new THREE.CatmullRomCurve3([CV0, CV0.clone().add(V(2.5, 1.2, -0.05)), V(6.5, -1.6, 0.25), V(10.5, -1.0, 0.3), S.clone().addScaledVector(nIn, rG + 0.06)]);
  const erRoute = new THREE.CatmullRomCurve3([Em.clone().addScaledVector(dE, 0.08), Em.clone().lerp(Pcis, 0.5).add(V(0.25, -0.2, 0.08)), Pcis.clone().addScaledVector(nCis, 0.08)]);
  const route = [];
  for (let k = 0; k <= 20; k++) route.push(F.clone().lerp(Dc, k / 20));
  for (let k = 0; k <= 30; k++) route.push(erRoute.getPoint(k / 30));
  for (let k = 0; k <= 30; k++) route.push(Ptr.clone().lerp(CV0, k / 30));
  for (let k = 0; k <= 160; k++) route.push(cvRoute.getPoint(k / 160));
  const clearOf = (p, r) => route.every((q) => q.distanceToSquared(p) > r * r);
  const nearG = (p, r) => stacks.some((s) => s.G.distanceTo(p) < r);

  // ======================= plasma membrane (wedge cell, apical microvilli) =======================
  const pmGeo = gridGeometry(200, 120, (u, v) => { const x = -LX * Math.cos(Math.PI * u), a = v * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const r = radAt(x, c, s) * (1 + 0.015 * (fbm(x * 0.4, c * 2, s * 2) - 0.5)); const p = V(x, c * r, s * r); return { p, k: p.distanceTo(S) - (RP - 0.02) }; }, true);
  B.mesh(pmGeo, M.pmK);
  const mv = [];
  for (let y = -2.4; y <= 2.4; y += 0.62) for (let z = -2.4; z <= 2.4; z += 0.62) { const yy = y + rr(-0.08, 0.08), zz = z + rr(-0.08, 0.08); const b = apexPt(yy, zz); if (b.x < 14.2 || b.distanceTo(S) < RP + 0.25) continue;
    const n = gradF(b); if (n.x < 0.55) continue; const L = rr(0.8, 1.15); mv.push({ b, n, L }); }
  B.inst(GEO.cyl, M.pm, mv.map((m) => ({ p: m.b.clone().addScaledVector(m.n, m.L / 2), s: V(0.1, 0.1, m.L), n: m.n })));
  B.inst(GEO.s2, M.pm, mv.map((m) => ({ p: m.b.clone().addScaledVector(m.n, m.L), s: 0.1 })));
  const tj = []; for (const xj of [13.35, 13.5, 13.65]) for (let a = 0; a < Math.PI * 2; a += 0.012) { const c = Math.cos(a), s = Math.sin(a), r = radAt(xj, c, s) - 0.02; tj.push({ p: V(xj, c * r, s * r), s: 0.028 }); }
  B.inst(GEO.s1, M.tj, tj);

  // ======================= nucleus =======================
  const necks = fibC(40).filter((d) => d.x < 0.1);
  const nucGeo = (r, amp, holes) => gridGeometry(120, 180, (u, v) => { const th = u * Math.PI, ph = v * Math.PI * 2, d = V(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
    return { p: N.clone().addScaledVector(d, r * (1 + amp * (fbm(d.x * 1.6, d.y * 1.6, d.z * 1.6) - 0.5))), ...(holes ? { k: Math.min(...necks.map((q) => q.angleTo(d))) - 0.022 } : {}) }; }, true);
  B.mesh(nucGeo(NR, 0.05, true), M.envK); B.mesh(nucGeo(NR - 0.07, 0.05, false), M.envelopeIn);
  const nucR = (d) => NR * (1 + 0.05 * (fbm(d.x * 1.6, d.y * 1.6, d.z * 1.6) - 0.5));
  const npc = fibC(1100).map((d) => ({ p: N.clone().addScaledVector(d, nucR(d) - 0.035), s: 1, n: d }));
  B.inst(new THREE.TorusGeometry(0.085, 0.032, 6, 16), M.envelope, npc);
  B.inst(GEO.s1, M.envelopeIn, npc.map((q) => ({ p: q.p, s: 0.035 })));
  const het = []; for (const d of fibC(5200)) { if (R() < 0.35) continue; if (npc.some(() => false)) continue; het.push({ p: N.clone().addScaledVector(d, nucR(d) - rr(0.2, 0.55)), s: V(rr(0.12, 0.24), rr(0.12, 0.24), rr(0.08, 0.14)), n: d }); }
  B.inst(GEO.s2, M.chromatin, het);
  const euc = []; while (euc.length < 7000) { const d = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)); if (d.length() > 1) continue; euc.push({ p: N.clone().addScaledVector(d, 4.9), s: rr(0.03, 0.06) }); }
  B.inst(GEO.s0, M.chromatin, euc, 0.3);
  const NL = N.clone().add(V(1.3, 1.1, -0.7)), nl = []; while (nl.length < 2600) { const d = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)); if (d.length() > 1) continue; nl.push({ p: NL.clone().addScaledVector(d, 1.6 * (0.8 + 0.2 * fbm(d.x * 3, d.y * 3, d.z * 3))), s: rr(0.06, 0.12) }); }
  B.inst(GEO.s1, M.nucleolus, nl);

  // ======================= mitochondria (placed before the RER so cisternae curve around them) =======================
  const mitos = [];
  const okMito = (pts) => pts.every((p) => inF(p) < 0.82 && p.distanceTo(N) > NR + 0.75 && !nearG(p, 2.2) && clearOf(p, 1.0) && mitos.every((m) => m.pts.every((q) => q.distanceTo(p) > 1.25)));
  const hm = { curve: new THREE.CatmullRomCurve3([V(2.4, -3.3, 0.5), V(3.8, -3.55, 0.55), V(5.2, -3.2, 0.5)]) }; hm.pts = hm.curve.getSpacedPoints(12); mitos.push(hm);
  for (let tries = 0; tries < 9000 && mitos.length < 44; tries++) {
    const zMid = mitos.length < 30 ? rr(-0.6, 0.55) : rr(-5, -0.6), p0 = V(rr(-14, 12), rr(-10, 10), zMid), dir = V(rr(-1, 1), rr(-1, 1), rr(-0.25, 0.25)).normalize(), L = rr(3, 6);
    const bend = V(rr(-1, 1), rr(-1, 1), 0).normalize().multiplyScalar(rr(0, 0.6));
    const curve = new THREE.CatmullRomCurve3([p0, p0.clone().addScaledVector(dir, L / 2).add(bend), p0.clone().addScaledVector(dir, L)]);
    const pts = curve.getSpacedPoints(12); if (okMito(pts)) mitos.push({ curve, pts });
  }
  const crist = [], mgran = [];
  for (const m of mitos) {
    B.mesh(bentCapsule(m.curve, 0.5, 72, 22), M.mitoOut); B.mesh(bentCapsule(m.curve, 0.44, 72, 22), M.mitoIn);
    const len = m.curve.getLength(), n = Math.floor((len - 0.5) / 0.13);
    for (let i = 1; i < n; i++) { const u = (0.25 + i * 0.13) / len; if (u > 0.95) break; const c = m.curve.getPointAt(u), t = m.curve.getTangentAt(u), side = V().crossVectors(t, UP).normalize();
      const sh = (i % 2 ? 1 : -1) * rr(0.04, 0.1); crist.push({ p: c.addScaledVector(side, sh), s: V(rr(0.3, 0.37), rr(0.3, 0.37), 0.018), n: t }); }
    for (let i = 0; i < 4; i++) mgran.push({ p: m.curve.getPointAt(rr(0.15, 0.85)).add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), rr(-0.2, 0.2))), s: 0.03 });
  }
  B.inst(GEO.s2, M.cristae, crist); B.inst(GEO.s1, M.lyso, mgran);
  const MH = new Map(), mkey = (x, y, z) => `${Math.floor(x / 1.5)},${Math.floor(y / 1.5)},${Math.floor(z / 1.5)}`;
  for (const m of mitos) for (const q of m.curve.getSpacedPoints(24)) { const k = mkey(q.x, q.y, q.z); if (!MH.has(k)) MH.set(k, []); MH.get(k).push(q); }
  const mitoNear = (p) => { const out = []; const cx = Math.floor(p.x / 1.5), cy = Math.floor(p.y / 1.5), cz = Math.floor(p.z / 1.5);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const a = MH.get(`${cx + dx},${cy + dy},${cz + dz}`); if (a) out.push(...a); } return out; };
  const nearMito = (p, r) => mitoNear(p).some((q) => q.distanceTo(p) < r);
  anchors.mito = hm.curve.getPointAt(0.5).add(V(0, 0, 0.3));

  // ======================= rough ER =======================
  const erMask = (k, d) => { const p = N.clone().addScaledVector(d, Rk(k, d));
    const e1 = clamp01((maxDx(k) - d.x) / 0.08), f = inF(p), e2 = clamp01((0.9 - f) / 0.1);
    let e3 = 1; for (const s of stacks) e3 = Math.min(e3, clamp01((s.G.distanceTo(p) - 2.1) / 0.4));
    let e4 = 1; for (const q of mitoNear(p)) { const dd = q.distanceTo(p); if (dd < 1.2) e4 = Math.min(e4, clamp01((dd - 0.62) / 0.25)); }
    return Math.min(e1, e2, e3, e4); };
  for (let k = 0; k < KN; k++) {
    const aMax = Math.acos(-maxDx(k)) + 0.05;
    for (const sg of [-1, 1]) {
      const g = gridGeometry(150, 300, (u, v) => { const al = u * aMax, be = v * Math.PI * 2, d = V(-Math.cos(al), Math.sin(al) * Math.cos(be), Math.sin(al) * Math.sin(be));
        const e = erMask(k, d), hole = e > 0.5 ? 0.74 - fbm(d.x * 11 + k, d.y * 11, d.z * 11) : 1;
        const neck = k === 0 && sg < 0 ? Math.min(...necks.map((q) => q.angleTo(d))) - 0.02 : 1;
        return { p: N.clone().addScaledVector(d, Rk(k, d) + sg * LH * Math.sqrt(e)), k: Math.min(e - 0.01, hole, neck) }; }, true);
      B.mesh(g, M.erK);
    }
  }
  // second family: cisternae stacked parallel to the lateral plasma membrane (EM: parallel arrays filling the basal/lateral cytoplasm),
  // starting where the perinuclear (concentric) stack ends → together they give the characteristic whorled-then-parallel RER
  const NJ = 8, latX0 = -13.8, latX1 = 2.6;
  const latUnd = (x, a) => 0.22 * (fbm(x * 0.35 + 7, Math.cos(a) * 1.7, Math.sin(a) * 1.7) - 0.5);
  const routeMin = (p) => { let m = 1e9; for (const q of route) { const dd = q.distanceToSquared(p); if (dd < m) m = dd; } return Math.sqrt(m); };
  const latMask = (p, x) => { let e = Math.min(clamp01((p.distanceTo(N) - (NR + KN * DR + 0.35)) / 0.5), clamp01((latX1 - x) / 0.9), clamp01((0.93 - inF(p)) / 0.06),
      clamp01((p.distanceTo(CV0) - rCV - 0.4) / 0.4), clamp01((routeMin(p) - 0.55) / 0.35), clamp01((p.distanceTo(Em) - 1.0) / 0.4), clamp01((p.distanceTo(Dc) - 1.0) / 0.4));
    for (const s of stacks) e = Math.min(e, clamp01((s.G.distanceTo(p) - 2.1) / 0.4));
    for (const q of mitoNear(p)) { const dd = q.distanceTo(p); if (dd < 1.2) e = Math.min(e, clamp01((dd - 0.62) / 0.25)); }
    return e; };
  const latC = (j, x, a) => { const c = Math.cos(a), s = Math.sin(a), r = radAt(x, c, s) - (0.42 + j * DR + latUnd(x, a)); return { p: V(x, c * r, s * r), n: V(0, c, s), r }; };
  for (let j = 0; j < NJ; j++) {
    const NU = 230, NV = 260, cache = [];
    for (let i = 0; i <= NU; i++) for (let q = 0; q <= NV; q++) { const x = latX0 + (latX1 - latX0) * i / NU, a = q / NV * Math.PI * 2, L0 = latC(j, x, a);
      const e = L0.r > 0.6 ? latMask(L0.p, x) : 0, hole = e > 0.5 ? 0.74 - fbm(x * 5.5 + j * 3, Math.cos(a) * 6, Math.sin(a) * 6) : 1; cache.push({ L0, e, hole }); }
    for (const sg of [-1, 1]) B.mesh(gridGeometry(NU, NV, (u, v) => { const C0 = cache[Math.round(u * NU) * (NV + 1) + Math.round(v * NV)];
      return { p: C0.L0.p.clone().addScaledVector(C0.L0.n, sg * LH * Math.sqrt(C0.e)), k: Math.min(C0.e - 0.01, C0.hole) }; }, true), M.erK);
  }
  for (const d of necks) { if (erMask(0, d) < 0.9) continue; // continuity with the outer nuclear membrane
    const r0 = nucR(d), r1 = Rk(0, d) - LH, c = N.clone().addScaledVector(d, (r0 + r1) / 2); const cy = new THREE.CylinderGeometry(0.11, 0.11, r1 - r0 + 0.06, 16, 1, true);
    const m = B.mesh(cy, M.er); m.position.copy(c); m.quaternion.setFromUnitVectors(V(0, 1, 0), d); }
  // ER-bound polysomes on both cytosolic faces (exit site and hero dock kept clear)
  const ribo = [], cohortRib = [];
  for (let gI = 0; gI < 40000; gI++) {
    const k = Math.floor(R() * KN), aMax = Math.acos(-maxDx(k)), al = Math.acos(1 - R() * (1 - Math.cos(aMax))), be = R() * Math.PI * 2;
    const d = V(-Math.cos(al), Math.sin(al) * Math.cos(be), Math.sin(al) * Math.sin(be)), e = erMask(k, d); if (e < 0.4) continue;
    const sg = R() < 0.5 ? 1 : -1, tang = V().crossVectors(d, V(rr(-1, 1), rr(-1, 1), rr(-1, 1))).normalize();
    for (let j = 0; j < 6; j++) { const dd = d.clone().addScaledVector(tang, (j - 2.5) * 0.0075 + Math.sin(j * 1.3) * 0.002).normalize();
      const p = N.clone().addScaledVector(dd, Rk(k, dd) + sg * (LH * Math.sqrt(e) + 0.03));
      if (p.distanceTo(Em) < 0.35 || p.distanceTo(Dc) < 0.12) continue; ribo.push({ p, s: 1, n: dd.clone().multiplyScalar(sg) }); }
  }
  for (let gI = 0; gI < 52000; gI++) { const j = Math.floor(R() * NJ), x = latX0 + (latX1 - latX0) * R(), a = R() * Math.PI * 2, L0 = latC(j, x, a); if (L0.r < 0.6) continue;
    const e = latMask(L0.p, x); if (e < 0.4) continue; const sg = R() < 0.5 ? 1 : -1, t2 = V().crossVectors(L0.n, V(1, 0, 0)), dir = V(R() - 0.5, 0, 0).addScaledVector(t2, R() - 0.5).normalize();
    for (let q = 0; q < 6; q++) ribo.push({ p: L0.p.clone().addScaledVector(dir, (q - 2.5) * 0.06 + Math.sin(q * 1.3) * 0.012).addScaledVector(L0.n, sg * (LH * Math.sqrt(e) + 0.03)), s: 1, n: L0.n.clone().multiplyScalar(sg) }); }
  // the ribosomes that make the rest of the labeled cohort (near the hero dock, same cisterna, cytosolic face)
  const NM = 12, home = [], nbP = [];
  for (let i = 0; i < NM; i++) { const a = i === 0 ? 0.12 : 0.03 + 0.42 * ((i * 0.618) % 1), dz = i === 0 ? 0 : ((i * 0.37) % 1 - 0.5) * 0.05;
    const d = dD.clone().lerp(dE, a).add(V(0, 0, dz)).normalize(); home.push(lumAt(d)); nbP.push({ d, p: N.clone().addScaledVector(d, Rk(kH, d) + LH + 0.03) }); }
  for (const q of nbP.slice(1)) ribo.push({ p: q.p, s: 1, n: q.d });
  const near = (q) => q.p.distanceTo(Dc) < 1.6 || q.p.distanceTo(Em) < 1.6; B.inst(RIBO, M.ribosome, ribo.filter((q) => !near(q)), 0.25); B.inst(RIBO_HI, M.ribosome, ribo.filter(near), 0.25);
  B.inst(new THREE.TorusGeometry(0.014, 0.006, 8, 16), M.translocon, [{ p: Dm.clone().addScaledVector(dD, -0.01), s: 1, n: dD }, ...nbP.slice(1).map((q) => ({ p: N.clone().addScaledVector(q.d, Rk(kH, q.d) + LH - 0.01), s: 1, n: q.d }))]);
  const lum = []; for (let i = 0; i < 2600; i++) { const d = dD.clone().lerp(dE, rr(-0.5, 1.3)).add(V(0, 0, rr(-0.06, 0.06))).normalize(); lum.push({ p: N.clone().addScaledVector(d, Rk(kH, d) + rr(-0.035, 0.035)), s: rr(0.006, 0.01) }); }
  B.inst(GEO.s1, M.cargo, lum);

  // ======================= Golgi stacks, VTCs, TGN, vesicles =======================
  const gv = [], tgnBuds = [];
  for (const s of stacks) {
    for (let k = 0; k < GK; k++) for (const sg of [-1, 1]) {
      const g = gridGeometry(36, 110, (u, v) => { const rho = u, phi = v * Math.PI * 2, rim = sm(0.7, 0.9, rho), th = (0.026 + 0.03 * rim) * Math.sqrt(Math.max(0, 1 - rho ** 10));
        const p0 = gPt(s, k, rho, phi), wob = 0.04 * (fbm(p0.x * 2, p0.y * 2, p0.z * 2 + k) - 0.5);
        const hole = rho > 0.5 && rho < 0.9 ? 0.68 - fbm(p0.x * 7 + k * 3, p0.y * 7, p0.z * 7) : 1;
        return { p: p0.addScaledVector(s.a, sg * th + wob), k: hole }; }, true);
      B.mesh(g, M.golgiK);
    }
    for (let i = 0; i < 16; i++) { const phi = rr(0, 6.283), rho = rr(0.3, 1.05); let p = gPt(s, GK - 1, Math.min(rho, 1), phi, 0.12); const pts = [p.clone()];
      for (let j = 0; j < 5; j++) { p = p.clone().addScaledVector(s.b1, rr(-0.18, 0.18)).addScaledVector(s.b2, rr(-0.18, 0.18)).addScaledVector(s.a, rr(0, 0.08)); pts.push(p.clone()); }
      B.tube(pts, 0.03, M.golgi, 30); tgnBuds.push({ p: pts[5].clone().addScaledVector(s.a, 0.05), s: 0.07 }); }
    for (let i = 0; i < 9; i++) { const c = gPt(s, 0, rr(0.25, 0.85), rr(0, 6.283), -0.32); for (let j = 0; j < 4; j++) gv.push({ p: c.clone().add(V(rr(-0.14, 0.14), rr(-0.14, 0.14), rr(-0.08, 0.08))), s: rr(0.05, 0.065) }); }
    for (let i = 0; i < 70; i++) { const phi = rr(0, 6.283), rho = rr(1.05, 1.35), k = Math.floor(rr(0, GK)); gv.push({ p: gPt(s, k, 1, phi).addScaledVector(s.b1, Math.cos(phi) * (rho - 1) * s.R).addScaledVector(s.b2, Math.sin(phi) * (rho - 1) * s.R), s: rr(0.05, 0.07) }); }
  }
  B.inst(GEO.s2, M.vesicle, gv); B.inst(GEO.s2, M.vesicle, tgnBuds);
  const lumG = []; for (const s of stacks) for (let k = 0; k < GK; k++) for (let i = 0; i < 260; i++) lumG.push({ p: gPt(s, k, Math.sqrt(R()) * 0.88, rr(0, 6.283)), s: rr(0.005, 0.009) });
  B.inst(GEO.s1, M.cargo, lumG);
  anchors.golgiRim = gPt(S1, 2.5, 0.55, Math.PI * 1.05, 0).add(V(0, 0, 0.35));

  // condensing vacuoles (static ones on the other stacks) and zymogen granules
  const lumpy = (r, amp, sd) => gridGeometry(48, 96, (u, v) => { const th = u * Math.PI, ph = v * Math.PI * 2, d = V(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)); return { p: d.multiplyScalar(r * (1 + amp * (fbm(d.x * 2 + sd, d.y * 2, d.z * 2) - 0.5))) }; }, true);
  const vacs = [];
  for (const s of stacks.slice(1)) { const c = gPt(s, GK - 1, 0.1, 0, 1.4); c.z = Math.min(c.z, 0.2); const m = B.mesh(lumpy(rr(0.85, 1.0), 0.18, vacs.length * 3), M.vacuole); m.position.copy(c); vacs.push(c); }
  const gran = [];
  for (let i = 0; i < 30000 && gran.length < 170; i++) { const r = rr(0.42, 0.55) * 2 * 0.95, p = V(rr(2.5, 14), rr(-7, 7), i % 2 ? rr(-0.25, 0.75) : rr(-7, 0.6));
    if ([V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)].some((d) => inF(p.clone().addScaledVector(d, r + 0.18)) > 0.93)) continue;
    if (!clearOf(p, r + 0.25) || p.distanceTo(S) < RP + r || nearMito(p, r + 0.55) || nearG(p, 2.0 + r) || vacs.some((c) => c.distanceTo(p) < r + 1.1) || p.distanceTo(CV0) < r + 1.2 || gran.some((g) => g.p.distanceTo(p) < g.s + r + 0.08)) continue;
    gran.push({ p, s: r }); }
  B.inst(new THREE.IcosahedronGeometry(1, 4), M.granule, gran);
  // lysosomes, peroxisomes, microtubules
  const pickFree = (r, zr) => { for (let i = 0; i < 4000; i++) { const p = V(rr(-13, 12), rr(-9, 9), rr(zr[0], zr[1])); if (inF(p) < 0.8 && p.distanceTo(N) > NR + r + 0.4 && !nearG(p, 2 + r) && !nearMito(p, r + 0.6) && clearOf(p, r + 0.4) && gran.every((g) => g.p.distanceTo(p) > g.s + r + 0.1)) return p; } return null; };
  for (let i = 0; i < 7; i++) { const p = pickFree(0.32, [-3, 0.5]); if (p) { const m = B.mesh(lumpy(rr(0.22, 0.32), 0.3, 10 + i), M.lyso); m.position.copy(p); } }
  for (let i = 0; i < 7; i++) { const p = pickFree(0.2, [-3, 0.5]); if (p) { const m = B.mesh(lumpy(rr(0.12, 0.18), 0.1, 20 + i), M.perox); m.position.copy(p); } }
  for (let i = 0; i < 40; i++) { const hx = hOf(12) * 0.7; let p = V(rr(11, 13), rr(-hx, hx), rr(-hx, 0.6)); const pts = [p.clone()];
    for (let j = 0; j < 10; j++) { p = p.clone().add(V(-rr(0.9, 1.3), rr(-0.25, 0.25), rr(-0.12, 0.12))); if (inF(p) > 0.8 || p.distanceTo(N) < NR + 0.4 || nearG(p, 1.7)) break; pts.push(p.clone()); }
    if (pts.length > 3) B.tube(pts, 0.025, M.mt, pts.length * 6); }

  // ======================= cytosol: free polysomes + crowding near the action =======================
  const cytOK = (p) => inF(p) < 0.97 && p.distanceTo(N) > NR + 0.05 && !nearG(p, 1.75) && gran.every((g) => g.p.distanceTo(p) > g.s + 0.03) && !nearMito(p, 0.56) && p.distanceTo(CV0) > rCV + 0.05
    && vacs.every((c) => c.distanceTo(p) > 1.05);
  const inRERsheet = (p) => { const v = p.clone().sub(N), r = v.length(), d = v.normalize(); if (d.x > 0.6) return 0; for (let k = 0; k < KN; k++) { const dr = Math.abs(r - Rk(k, d)); if (dr < LH + 0.03 && erMask(k, d) > 0.01) return dr < LH - 0.008 ? 2 : 1; }
    if (p.x > latX0 && p.x < latX1) { const a = Math.atan2(p.z, p.y), c = Math.cos(a), s = Math.sin(a), dl = radAt(p.x, c, s) - Math.hypot(p.y, p.z);
      for (let j = 0; j < NJ; j++) { const dr = Math.abs(dl - (0.42 + j * DR + latUnd(p.x, a))); if (dr < LH + 0.03 && latMask(p, p.x) > 0.01) return dr < LH - 0.008 ? 2 : 1; } }
    return 0; };
  const poly = [];
  for (let i = 0; i < 26000 && poly.length < 14000; i++) { const c = V(rr(-14, 14), rr(-10, 10), rr(-8, 0.8)); if (!cytOK(c) || inRERsheet(c)) continue; const n = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), t1 = V().crossVectors(n, UP).normalize(), t2 = V().crossVectors(n, t1);
    for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283; poly.push({ p: c.clone().addScaledVector(t1, Math.cos(a) * 0.055).addScaledVector(t2, Math.sin(a) * 0.055), s: 1, n: t1.clone().multiplyScalar(-Math.sin(a)).addScaledVector(t2, Math.cos(a)) }); } }
  const nearP = (q) => q.p.distanceTo(Dc) < 1.6 || q.p.distanceTo(Em) < 1.6 || q.p.distanceTo(S1.G) < 3; B.inst(RIBO, M.ribosome, poly.filter((q) => !nearP(q)), 0.25); B.inst(RIBO_HI, M.ribosome, poly.filter(nearP), 0.25);
  const crowd = [], crowdL = [];
  const fillCrowd = (c, rad, n) => { for (let i = 0; i < n; i++) { const d = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)); if (d.length() > 1) continue; const p = c.clone().addScaledVector(d, rad); if (p.z > 0.8 || !cytOK(p)) continue;
    const s = inRERsheet(p); if (s === 1) continue; (s === 2 ? crowdL : crowd).push({ p, s: rr(0.004, 0.008), q: new THREE.Quaternion().setFromUnitVectors(UP, V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize()) }); } };
  fillCrowd(Dc, 0.9, 4500 * DEN); fillCrowd(Em, 0.9, 4500 * DEN); fillCrowd(S1.G, 2.0, 30000 * DEN); fillCrowd(S, 1.6, 2500); fillCrowd(anchors.mito, 1.6, 12000 * DEN);
  if (DEN > 1) { for (let k = 0; k <= 8; k++) fillCrowd(cvRoute.getPoint(k / 12), 1.3, 2500 * DEN); for (let k = 0; k <= 4; k++) fillCrowd(erRoute.getPoint(k / 4), 0.8, 2500 * DEN); }
  // soluble proteins come in different shapes (globular, two-domain, elongated) — Goodsell-style crowding
  const cat2 = (a, b) => { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal']) { const x = a.attributes[k].array, y = b.attributes[k].array, o = new Float32Array(x.length + y.length); o.set(x); o.set(y, x.length); g.setAttribute(k, new THREE.BufferAttribute(o, 3)); } return g; };
  const dumb = cat2(new THREE.IcosahedronGeometry(0.8, 1).translate(0, 0, 0.7), new THREE.IcosahedronGeometry(0.65, 1).translate(0, 0, -0.75)), rod = new THREE.CapsuleGeometry(0.45, 1.8, 4, 8).rotateX(Math.PI / 2);
  B.inst(GEO.s1, M.cyto, crowd.filter((_, i) => i % 3 === 0), 0.35); B.inst(dumb, M.cyto, crowd.filter((_, i) => i % 3 === 1), 0.35); B.inst(rod, M.cyto, crowd.filter((_, i) => i % 3 === 2), 0.35);
  B.inst(GEO.s1, M.cargo, crowdL);
  const actin = []; // terminal web: actin filaments (Ø ~7 nm) under the apical membrane
  for (let i = 0; i < 20000 && actin.length < 1800; i++) { const y = rr(-2.6, 2.6), z = rr(-2.6, 0.6), top = apexPt(y, z); if (top.x < 13.8) continue; const p = V(top.x - rr(0.4, 1.0), y, z);
    if (inF(p) > 0.98 || gran.some((g) => g.p.distanceTo(p) < g.s + 0.05) || p.distanceTo(S) < 1.7) continue;
    const t = V(rr(-0.15, 0.15), rr(-1, 1), rr(-1, 1)).normalize(); actin.push({ p, s: V(0.007, 0.007, rr(0.15, 0.35)), n: t }); }
  B.inst(GEO.cyl, M.actin, actin, 0.2);

  // ======================= neighbouring acinar cells (rosette around the lumen) =======================
  const erDotted = B.mat(C.er); erDotted.onBeforeCompile = (sh) => { sh.uniforms.uRib = { value: M.ribosome.color };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform vec3 uRib;').replace('#include <color_fragment>', '#include <color_fragment>\n vec3 q = fract(vWp * 14.0) - 0.5; float dt = smoothstep(0.26, 0.18, length(q)); diffuseColor.rgb = mix(diffuseColor.rgb, uRib, dt * 0.85);'); };
  erDotted.customProgramCacheKey = () => 'erDot'; keepify(erDotted);
  const L = V(LUMX, 0, 0), heroKids = [...hero.children];
  const neighbours = [];
  for (const deg of [40, -40, 80, -80, 120, -120, 160, -160]) {
    const outer = new THREE.Group(), inner = new THREE.Group(); outer.position.copy(L); outer.rotation.z = THREE.MathUtils.degToRad(deg); inner.position.copy(L).negate();
    if (Math.abs(deg) % 80 === 40) inner.scale.y = -1;
    for (const ch of heroKids) { if (ch.isInstancedMesh && (ch.geometry === RIBO || ch.geometry === RIBO_HI)) continue; let c;
      if (ch.isInstancedMesh) { c = new THREE.InstancedMesh(ch.geometry, ch.material, ch.count); c.instanceMatrix = ch.instanceMatrix; c.instanceColor = ch.instanceColor; c.count = ch.count; }
      else { c = new THREE.Mesh(ch.geometry, ch.material === M.erK ? erDotted : ch.material); c.position.copy(ch.position); c.quaternion.copy(ch.quaternion); c.scale.copy(ch.scale); }
      c.frustumCulled = false; inner.add(c); }
    outer.add(inner); scene.add(outer); neighbours.push(outer); }
  anchors.acinus = L.clone(); anchors.center = V(0, 0, -1);

  // ======================= dynamic actors =======================
  const P = {
    ribo: new Pool(scene, RIBO_HI, M.riboGhost = Object.assign(M.ribosome.clone(), { transparent: true, depthWrite: false }), 4), mrna: new Pool(scene, GEO.s1, M.mrna, 160), chain: new Pool(scene, GEO.s1, M.tracer, 400),
    sig: new Pool(scene, GEO.s1, M.signal, 20), blob: new Pool(scene, GEO.s1, M.tracer, 2400), cargoU: new Pool(scene, GEO.s1, M.cargo, 1600),
  };
  const mkClipMesh = (geo, base) => { const m = base.clone(); m.clippingPlanes = [new THREE.Plane(V(0, 0, 1), 1e4)]; if (base.onBeforeCompile) { m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey; }
    const me = new THREE.Mesh(geo, m); me.frustumCulled = false; me.visible = false; scene.add(me); return me; };
  const vesER = [0, 1, 2].map(() => mkClipMesh(new THREE.IcosahedronGeometry(1, 3), M.vesicle));
  const vesTG = [0, 1, 2, 3].map(() => mkClipMesh(new THREE.IcosahedronGeometry(1, 3), M.vesicle));
  const cvMesh = mkClipMesh(lumpy(1, 0.14, 7), M.vacuole), coreMesh = mkClipMesh(new THREE.IcosahedronGeometry(1, 4), M.granule);
  const patchGeo = new THREE.BufferGeometry(), PU = 22, PV = 72; patchGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PU + 1) * (PV + 1) * 3), 3));
  { const idx = []; for (let i = 0; i < PU; i++) for (let j = 0; j < PV; j++) { const a = i * (PV + 1) + j, b = a + 1, c = a + PV + 1, d = c + 1; idx.push(a, c, b, b, c, d); } patchGeo.setIndex(idx); }
  const patch = new THREE.Mesh(patchGeo, M.pm); patch.frustumCulled = false; scene.add(patch);
  const pt1 = V().crossVectors(nOut, UP).normalize(), pt2 = V().crossVectors(nOut, pt1);
  const surfAt = (q) => { const v = q.clone(); for (let i = 0; i < 6; i++) { const f = inF(v); v.addScaledVector(nOut, (1 - f) * 0.25); } return v; };
  const patchBase = []; for (let i = 0; i <= PU; i++) for (let j = 0; j <= PV; j++) patchBase.push(null);
  const setClip = (me, o, n, off = 0.004) => { const pl = me.material.clippingPlanes[0]; pl.normal.copy(n); pl.constant = -n.dot(o) + off; };
  const noClip = (me) => { const pl = me.material.clippingPlanes[0]; pl.normal.set(0, 0, 1); pl.constant = 1e4; };

  // ---------- timing helpers (windows from story.T) ----------
  const erS = (v, T) => { const b0 = T.erBud0 + v * T.erBudDur, b1 = b0 + T.erBudDur, r1 = b1 + T.erTransit; return { b0, b1, r1, f1: r1 + T.cisFuse }; };
  const tgS = (v, T) => { const b0 = T.tgnBud0 + v * T.tgnStagger, b1 = b0 + T.tgnBudDur, r1 = b1 + T.tgnTransit; return { b0, b1, r1, f1: r1 + T.cvFuse }; };
  const rvE = 0.065, rvT = 0.08;
  const budH = (u, r) => (u < 0.75 ? -r + 1.8 * r * ease(u / 0.75) : 0.8 * r + 0.3 * r * ease((u - 0.75) / 0.25));
  const tgnPt = (v) => gPt(S1, GK - 1, 0.45 + 0.12 * v, Math.PI * (0.95 + 0.1 * v), 0.03);
  const cvEntry = (v) => CV0.clone().add(V(-0.75, -0.35 + 0.25 * v, 0.1 * (v - 1.5)).normalize().multiplyScalar(rCV));
  function erVes(v, t, T) { const s = erS(v, T); if (t < s.b0 || t >= s.f1) return null; const o = Em.clone().addScaledVector(V().crossVectors(dE, UP).normalize(), (v - 1) * 0.11);
    if (t < s.b1) return { c: o.clone().addScaledVector(dE, budH(win(t, s.b0, s.b1), rvE)), o, n: dE };
    if (t < s.r1) { const u = ease(win(t, s.b1, s.r1)); return { c: erRoute.getPoint(u).addScaledVector(S1.b2, (v - 1) * 0.12 * Math.sin(u * Math.PI)) }; }
    const pc = Pcis.clone().addScaledVector(S1.b2, (v - 1) * 0.15); return { c: pc.clone().addScaledVector(nCis, rvE + 0.02 - (2 * rvE + 0.02) * ease(win(t, s.r1, s.f1))), o: pc, n: nCis }; }
  function tgVes(v, t, T) { const s = tgS(v, T); if (t < s.b0 || t >= s.f1) return null; const o = tgnPt(v);
    if (t < s.b1) return { c: o.clone().addScaledVector(nTr, budH(win(t, s.b0, s.b1), rvT)), o, n: nTr };
    const en = cvEntry(v), outN = en.clone().sub(CV0).normalize();
    if (t < s.r1) return { c: o.clone().addScaledVector(nTr, rvT * 1.1).lerp(en.clone().addScaledVector(outN, rvT + 0.02), ease(win(t, s.b1, s.r1))) };
    return { c: en.clone().addScaledVector(outN, rvT + 0.02 - (2 * rvT + 0.02) * ease(win(t, s.r1, s.f1))), o: en, n: outN }; }
  // condensing vacuole → zymogen granule → apex → fusion
  function cvState(t, T) {
    const cond = ease(win(t, ...T.condense)), mv = ease(win(t, ...T.toApex)), r = rCV + (rG - rCV) * cond;
    if (t < T.fuse[0]) return { c: mv > 0 ? cvRoute.getPoint(mv) : CV0.clone(), r, cond, hc: null };
    const u = win(t, ...T.fuse), hc = u < 0.18 ? rG + 0.06 - 0.06 * ease(u / 0.18) : u < 0.32 ? rG - 0.35 * rG * ease((u - 0.18) / 0.14) : 0.65 * rG - 1.55 * rG * ease((u - 0.32) / 0.68);
    return { c: S.clone().addScaledVector(nIn, hc), r: rG, cond: 1, hc, u };
  }

  const parts = [];
  for (let i = 0; i < NM; i++) parts.push({ lab: true, i, v: i % 3, w: i % 4, off: fibC(12)[i], home: home[i] });
  for (let j = 0; j < 30; j++) parts.push({ lab: false, i: j, v: j % 3, w: j % 4, off: fibC(30)[j], home: null });
  const waitP = (pt) => { const o = Em.clone().addScaledVector(V().crossVectors(dE, UP).normalize(), (pt.v - 1) * 0.11); return o.addScaledVector(dE, -LH - 0.004).addScaledVector(pt.off, 0.02); };
  const golP = (pt, k) => gPt(S1, k, 0.5 + 0.15 * ((pt.i * 0.37) % 1), Math.PI * (0.92 + 0.22 * ((pt.i * 0.61) % 1)));
  const cvIn = (pt, st) => st.c.clone().addScaledVector(pt.off, st.r * (0.25 + 0.4 * ((pt.i * 0.53) % 1)));
  function where(pt, t, T) {
    const se = erS(pt.v, T), st = tgS(pt.w, T);
    const inner = (c, r) => c.clone().addScaledVector(pt.off, r * 0.5);
    if (t < se.b0 + 0.3 * T.erBudDur) { const w = waitP(pt); if (!pt.home) return [[w, 1]]; const u = ease(win(t, ...T.flow)); return [[pt.home.clone().lerp(w, u), 1]]; }
    if (t < se.b1) { const ve = erVes(pt.v, t, T); return [[waitP(pt).lerp(inner(ve.c, rvE), ease(win(win(t, se.b0, se.b1), 0.3, 0.7))), 1]]; }
    if (t < se.r1) return [[inner(erVes(pt.v, t, T).c, rvE), 1]];
    if (t < se.f1) { const ve = erVes(pt.v, t, T); return [[inner(ve.c, rvE).lerp(golP(pt, 0), ease(win(win(t, se.r1, se.f1), 0.3, 1))), 1]]; }
    if (t < st.b0 + 0.3 * T.tgnBudDur) { const lag = 0.18 * ((pt.i * 0.29) % 1), kf = clamp01(win(t, ...T.golgi) * 1.18 - lag) * (GK - 1), k0 = Math.floor(Math.min(kf, GK - 1.0001)), f = ease(kf - k0);
      if (kf >= GK - 1) return [[golP(pt, GK - 1), 1]]; return [[golP(pt, k0), 1 - f], [golP(pt, k0 + 1), f]]; }
    if (t < st.b1) { const ve = tgVes(pt.w, t, T); return [[golP(pt, GK - 1).lerp(inner(ve.c, rvT), ease(win(win(t, st.b0, st.b1), 0.3, 0.7))), 1]]; }
    if (t < st.r1) return [[inner(tgVes(pt.w, t, T).c, rvT), 1]];
    const cs = cvState(t, T);
    if (t < st.f1) { const ve = tgVes(pt.w, t, T); return [[inner(ve.c, rvT).lerp(cvIn(pt, cs), ease(win(win(t, st.r1, st.f1), 0.3, 1))), 1]]; }
    if (t < T.fuse[0] || cs.u < 0.3) return [[cvIn(pt, cs), 1]];
    const rel = ease(win(cs.u, 0.3 + 0.03 * (pt.i % 6), 0.75 + 0.03 * (pt.i % 6))), late = Math.max(0, t - T.fuse[1]);
    const outP = S.clone().addScaledVector(nOut, 0.35 + 0.9 * ((pt.i * 0.41) % 1) + 0.04 * late).addScaledVector(pt1, pt.off.y * 0.9 + 0.02 * late * pt.off.x).addScaledVector(pt2, pt.off.z * 0.5);
    return [[rel < 0.5 ? cvIn(pt, cs).lerp(S, rel * 2) : S.clone().lerp(outP, (rel - 0.5) * 2), 1]];
  }
  function census(t, T) { const c = { notYet: 0, er: 0, toGolgi: 0, golgi: 0, toPM: 0, outside: 0 };
    for (const pt of parts) { if (!pt.lab) continue; const se = erS(pt.v, T), st = tgS(pt.w, T), made = pt.i === 0 ? T.translate[0] : T.dock[0] + pt.i * 0.35;
      if (t < made) c.notYet++; else if (t < se.b0 + 0.75 * T.erBudDur) c.er++; else if (t < se.f1) c.toGolgi++; else if (t < st.b0 + 0.75 * T.tgnBudDur) c.golgi++;
      else if (t < T.fuse[0] + 0.4 * (T.fuse[1] - T.fuse[0])) c.toPM++; else c.outside++; }
    return c; }

  // replay clouds (pulse-chase): label in RER → Golgi → apical granules / lumen
  const repA = [], repB = [], repC = [];
  for (let i = 0; i < 260; i++) { const k = Math.floor(rr(0, KN)), d = V(rr(-1, 0.4), rr(-1, 1), rr(-0.05, 0.1)).normalize(); if (erMask(k, d) < 0.5) continue; const p = N.clone().addScaledVector(d, Rk(k, d)); if (p.z < 0.75 && p.z > -0.6) repA.push(p); }
  for (const s of stacks) for (let k = 0; k < GK; k++) for (let i = 0; i < 18; i++) { const p = gPt(s, k, rr(0.2, 0.85), rr(0, 6.283)); if (p.z < 0.78) repB.push(p); }
  gran.filter((g) => g.p.x > 9 && g.p.z > -1.4).slice(0, 18).forEach((g) => { for (let i = 0; i < 7; i++) repC.push(g.p.clone().addScaledVector(fibC(7)[i], g.s * 0.5)); });
  for (let i = 0; i < 60; i++) repC.push(L.clone().add(V(rr(-1.2, 1.2), rr(-1.2, 1.2), rr(-0.6, 0.6))));

  let MS = 1; const mol = (p, sc) => { sc *= MS; if (sc > 0.01) for (const d of fibC(5)) P.blob.add(V().copy(p).addScaledVector(d, 0.006 * sc), 0.0045 * sc); };
  function update(t, T) {
    MS = T.molScale || 1;
    Object.values(P).forEach((p) => p.begin());
    const uT = win(t, ...T.translate), uD = ease(win(t, ...T.dock)), uL = win(t, ...T.lumen);
    M.riboGhost.opacity = 1 - 0.72 * ease(win(t, T.lumen[0] - 0.6, T.lumen[0] + 0.4)) * (1 - ease(win(t, T.flow[0] - 0.6, T.flow[0])));
    const ribPos = F.clone().lerp(Dc, uD), axis = tD.clone().negate().lerp(dD.clone().negate(), uD).normalize();
    // hero ribosome + mRNA
    if (t < T.flow[0]) { P.ribo.add(ribPos, 1, axis.clone().negate()); const sd = V().crossVectors(axis, UP).normalize(), slide = (uT + uD + Math.min(uL, 0.6)) * 0.04;
      for (let k = -60; k <= 60; k++) P.mrna.add(ribPos.clone().addScaledVector(sd, k * 0.006 + slide).addScaledVector(axis, -0.03 + Math.sin(k * 0.4) * 0.003), 0.0035); }
    else if (t < T.flow[1]) { const u = ease(win(t, ...T.flow)); P.ribo.add(Dc.clone().addScaledVector(dD, 0.03 + 0.25 * u).addScaledVector(tD, 0.1 * u), 1, dD); }
    // nascent chain: signal peptide (cyan) first, through the translocon, cleaved, folds in the lumen
    const cf = ease(win(t, T.lumen[1] - 0.45, T.lumen[1]));
    if (t >= T.translate[0] && t < T.lumen[1]) {
      const n = Math.round(14 * uT) + Math.round(46 * Math.min(1, uL / 0.6)), exitP = ribPos.clone().addScaledVector(axis, 0.03);
      const dk = ease(win(uD, 0.55, 1)), cleave = ease(win(uL, 0.45, 0.6)), fold = ease(win(uL, 0.65, 1)), Lm = Math.max(1, n - 6);
      for (let j = 0; j < n; j++) { const q = n - 1 - j, straight = exitP.clone().addScaledVector(axis, q * 0.006).add(V(0, Math.sin(q * 0.8) * 0.002, Math.cos(q * 0.7) * 0.002));
        let docked; if (j < 6) docked = Dm.clone().addScaledVector(tD, 0.014).addScaledVector(dD, 0.004 - j * 0.0035);
        else { const m = j - 6, s = Lm > 1 ? m / (Lm - 1) : 0; docked = lumAt(dD.clone().lerp(dE, 0.002 + 0.03 * Math.sin(Math.PI * s)).normalize()).add(V(0, 0, 0.02 * Math.sin(2 * Math.PI * s) + 0.004 * Math.sin(m))).addScaledVector(dD, 0.012 * Math.sin(m * 0.7)); }
        const p = straight.lerp(docked, dk); if (j >= 6 && fold > 0) p.lerp(home[0].clone().addScaledVector(fibC(Math.max(8, Lm))[(j - 6) % Math.max(8, Lm)], 0.008), fold);
        if (j < 6) { if (cleave < 1) P.sig.add(p, 0.0042 * (1 - cleave)); } else P.chain.add(p, 0.004 * (1 - cf)); }
    }
    // molecules
    const fadeOut = T.replay ? 1 - ease(win(t, T.replay[0] - 2.4, T.replay[0] - 1.2)) : 1;
    for (const pt of parts) {
      if (pt.lab) { let sc = fadeOut;
        if (pt.i === 0) { if (t < T.lumen[1] - 0.45) continue; sc *= cf; }
        else { const g = ease(win(t, T.dock[0] + pt.i * 0.35, T.lumen[1] - 2.5 + pt.i * 0.15)); if (g <= 0) continue; sc *= g;
          if (g < 1) for (let k = 0; k < 5; k++) P.chain.add(nbP[pt.i].p.clone().lerp(home[pt.i], (k + 1) / 6), 0.004); }
        for (const [p, s] of where(pt, t, T)) mol(p, s * sc);
      } else { if (t < T.flow[0]) continue; const f = ease(win(t, T.flow[0], T.flow[0] + 0.8)) * fadeOut; for (const [p, s] of where(pt, t, T)) P.cargoU.add(p, 0.006 * s * f); }
    }
    // vesicles (local clip planes give the bud / fusion profile against the membrane)
    vesER.forEach((me, v) => { const st = erVes(v, t, T); me.visible = !!st; if (!st) return; me.position.copy(st.c); me.scale.setScalar(rvE); if (st.o) setClip(me, st.o, st.n); else noClip(me); });
    vesTG.forEach((me, v) => { const st = tgVes(v, t, T); me.visible = !!st; if (!st) return; me.position.copy(st.c); me.scale.setScalar(rvT); if (st.o) setClip(me, st.o, st.n); else noClip(me); });
    const cs = cvState(t, T), lateGone = t > T.fuse[1];
    cvMesh.visible = !lateGone && cs.cond < 0.999; coreMesh.visible = !lateGone && cs.cond > 0.001 && !(cs.u > 0.32);
    cvMesh.position.copy(cs.c); cvMesh.scale.setScalar(cs.r); coreMesh.position.copy(cs.hc != null ? S.clone().addScaledVector(nIn, Math.max(cs.hc, rG * 0.5)) : cs.c);
    coreMesh.scale.setScalar(cs.r * (cs.u ? 1 - 0.85 * ease(win(cs.u, 0.3, 0.9)) : 1) * (0.92 + 0.08 * cs.cond));
    cvMesh.material.opacity = 1;
    if (cs.hc != null) { setClip(cvMesh, S, nIn); setClip(coreMesh, S, nIn, 0.01); } else { noClip(cvMesh); noClip(coreMesh); }
    // apical patch: flat membrane, or an Ω pore continuous with the granule membrane
    const rn = cs.hc != null && Math.abs(cs.hc) < rG ? Math.sqrt(rG * rG - cs.hc * cs.hc) : 0, pa = patchGeo.attributes.position.array;
    for (let i = 0; i <= PU; i++) for (let j = 0; j <= PV; j++) { const rho = rn + (RP - rn) * (i / PU), a = j / PV * Math.PI * 2;
      const base = surfAt(S.clone().addScaledVector(pt1, Math.cos(a) * rho).addScaledVector(pt2, Math.sin(a) * rho));
      const lip = rn > 0 ? Math.min(0.32, rG * 0.4) * Math.max(0, 1 - (rho - rn) / 0.55) ** 2 * Math.min(1, rn / 0.15) : 0;
      base.addScaledVector(nIn, lip); const k = (i * (PV + 1) + j) * 3; pa[k] = base.x; pa[k + 1] = base.y; pa[k + 2] = base.z; }
    patchGeo.attributes.position.needsUpdate = true; patchGeo.computeVertexNormals();
    // replay
    if (T.replay && t > T.replay[0] - 0.6) { const [r0, r1, r2] = T.replay;
      const a = ease(win(t, r0 - 0.4, r0 + 0.3)) * (1 - ease(win(t, r1, r1 + 0.7))), b = ease(win(t, r1 - 0.2, r1 + 0.5)) * (1 - ease(win(t, r2, r2 + 0.7))), c = ease(win(t, r2 - 0.2, r2 + 0.5));
      for (const [arr, w] of [[repA, a], [repB, b], [repC, c]]) if (w > 0.01) for (const p of arr) P.blob.add(p, 0.09 * w); }
    neighbours.forEach((g) => { g.visible = T.showNeighbours ? T.showNeighbours(t) : true; });
    Object.values(P).forEach((p) => p.end());
  }

  Object.assign(anchors, { ribosome: F.clone(), dock: Dc.clone(), lumen: home[0].clone(), exit: Em.clone(), apexSite: S.clone().addScaledVector(nIn, 0.5) });
  anchors.riboMove = (t, T) => F.clone().lerp(Dc, ease(win(t, ...T.dock)));
  anchors.cohort = (t, T) => { const c = V(); let n = 0; for (const pt of parts) if (pt.lab) for (const [p, s] of where(pt, t, T)) { c.addScaledVector(p, s); n += s; } return n ? c.multiplyScalar(1 / n) : home[0].clone(); };
  anchors.granuleHero = (t, T) => cvState(t, T).c;
  // palette switching (looks / pseudo-colour channels): palette key -> materials using it (incl. per-vesicle clones)
  const byKey = { pm: [M.pm, M.pmK, patch.material], envelope: [M.envelope, M.envK], envelopeIn: [M.envelopeIn], chromatin: [M.chromatin], nucleolus: [M.nucleolus], er: [M.er, M.erK, erDotted], ribosome: [M.ribosome, M.riboGhost],
    golgi: [M.golgi, M.golgiK], actin: [M.actin], vesicle: [M.vesicle, ...vesER.map((m) => m.material), ...vesTG.map((m) => m.material)], granuleM: [M.granule, coreMesh.material], vacuole: [M.vacuole, cvMesh.material],
    mitoOut: [M.mitoOut], mitoIn: [M.mitoIn, M.cristae], mt: [M.mt], cyto: [M.cyto], cargo: [M.cargo], lyso: [M.lyso], perox: [M.perox], tj: [M.tj] };
  const allMats = [...new Set(Object.values(byKey).flat())];
  function setPalette(pal, glow = 0) { for (const [k, ms] of Object.entries(byKey)) { const hex = (pal && pal[k]) || PALETTE[k]; for (const m of ms) { m.color.set(hex); m.emissive.set(hex); m.emissiveIntensity = glow; } } }
  return { anchors, update, census, cohortSize: NM, count: B.count, palette: PALETTE, materials: M, neighbours, setPalette, allMats };
}
