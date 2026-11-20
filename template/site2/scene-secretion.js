// Pancreatic acinar cell (schematic, polarized) for 人教版必修1 3.2「分泌蛋白的合成和运输」.
// Basal nucleus wrapped by rough-ER cisternae, supranuclear Golgi (cis faces ER/nucleus), zymogen granules apical.
// The process is a pure function of t. Rules honoured (review/科学审查_v1.md B3, review/审查_v2_分泌蛋白.md):
//  - labeled protein is conserved: one cohort of 12 labeled molecules, every frame each one is somewhere
//  - after entering the ER the cargo is always inside a lumen or a vesicle (never naked in the cytosol)
//  - budding and fusion are membrane events (bud grows out of the membrane; Ω-shaped fusion pore at the PM)
//  - ribosome stays on the cytosolic side; chain passes through a channel; signal peptide is cleaved
//  - secretion only at the apical membrane; Golgi: in at cis, out at trans; no ATP beams
// Units are schematic (NOT to scale); only the order of sizes is kept.
import * as THREE from 'three';
import { V, UP, fib, Builder, Pool, GEO, ease, win, clamp01 } from './lib.js';

export const PALETTE = {
  pm: '#8fb3d9', envelope: '#6d7fe0', chromatin: '#8a6cd6', nucleolus: '#5a43b5', er: '#2bb3a3', ribosome: '#ee6a94',
  golgi: '#f2914c', vesicle: '#f6c48d', granuleM: '#d7c3f2', granuleC: '#a88be0', mitoOut: '#ff7a63', mitoCr: '#c9452f',
  mt: '#74cfe3', cyto: '#6c7a96', mrna: '#ffffff', tracer: '#ffe27a', cargo: '#9fe0d6', signal: '#62f0ff', translocon: '#c8f56a',
};
export const AX = { a: 16, b: 10, c: 9 };
const ell = (p) => (p.x / AX.a) ** 2 + (p.y / AX.b) ** 2 + (p.z / AX.c) ** 2;
const surfR = (d) => 1 / Math.sqrt((d.x / AX.a) ** 2 + (d.y / AX.b) ** 2 + (d.z / AX.c) ** 2);
const wob = (d) => 1 + 0.012 * Math.sin(5.1 * d.x + 1.3) * Math.cos(4.3 * d.y) + 0.01 * Math.sin(7.3 * d.z + d.x);
const gradN = (p) => V(p.x / AX.a ** 2, p.y / AX.b ** 2, p.z / AX.c ** 2).normalize();
const FIBC = {}; const fibC = (n) => (FIBC[n] ||= fib(n));
const sdir = (a, b, u) => a.clone().lerp(b, u).normalize();

export function build(scene, seed = 3) {
  const B = new Builder(scene, seed), rr = (a, b) => B.rr(a, b), R = B.R;
  const C = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, new THREE.Color(v)]));
  const M = {
    pm: B.mat(C.pm), envelope: B.mat(C.envelope), chromatin: B.mat(C.chromatin, { roughness: 0.6 }), nucleolus: B.mat(C.nucleolus, { roughness: 0.6 }),
    er: B.mat(C.er), ribosome: B.mat(C.ribosome, { roughness: 0.5 }), golgi: B.mat(C.golgi),
    vesB: B.mat(C.vesicle), granB: B.mat(C.granuleM),
    granuleC: B.mat(C.granuleC, { roughness: 0.55 }), mitoOut: B.mat(C.mitoOut, { roughness: 0.5 }), mitoIn: B.mat(C.mitoCr, { roughness: 0.6 }),
    mitoCr: B.mat(C.mitoCr), mt: B.mat(C.mt, { roughness: 0.3 }), cyto: B.mat(C.cyto, { roughness: 0.7, clearcoat: 0 }), mrna: B.mat(C.mrna, { roughness: 0.3 }),
    cargo: B.mat(C.cargo, { roughness: 0.5 }), translocon: B.mat(C.translocon),
    tracer: B.mat(C.tracer, { emissive: C.tracer, emissiveIntensity: 1.4, roughness: 0.4 }),
    signal: B.mat(C.signal, { emissive: C.signal, emissiveIntensity: 0.9, roughness: 0.4 }),
  };
  const anchors = {};

  // =============================== layout constants ===============================
  const N = V(-8.6, 0, 0), NR = 4.0;
  const GK = 6, GSP = 0.62, GC = V(-1.4, -1.0, 0.15), gR = (k) => 3.4 - Math.abs(k - 2.5) * 0.18;
  const gX = (k, rho) => GC.x + (k - (GK - 1) / 2) * GSP - 0.9 * (1 - (Math.min(rho, gR(k)) / gR(k)) ** 2);
  const golgiPt = (k, dy, dz, off = 0) => V(gX(k, Math.hypot(dy, dz)) + off, GC.y + dy, GC.z + dz);
  const inGolgi = (p, pad) => { const rho = Math.hypot(p.y - GC.y, p.z - GC.z); if (rho > 3.5 + pad) return false; const r = Math.min(rho, 3.3);
    return p.x > gX(0, r) - 0.4 - pad && p.x < gX(GK - 1, r) + 0.4 + pad; };
  const ERR = [5.0, 6.2, 7.4], LUM = 0.7, ERCONE = 0.72, rO = ERR[2] + LUM, lumR = ERR[2] + LUM / 2;
  const sph = (d, r) => N.clone().addScaledVector(d.clone().normalize(), r);
  const dD = V(0.45, -0.89, 0.5 / lumR).normalize(), dE = V(0.656, -0.755, 0.45 / rO).normalize();
  const tD = V(-dD.y, dD.x, 0).normalize();
  const Dm = sph(dD, rO), Dc = sph(dD, rO + 0.2), F = Dc.clone().addScaledVector(dD, 1.3).addScaledVector(tD, 0.7);
  const E = sph(dE, rO), thDE = dD.angleTo(dE);
  const NM = 12, grp = (i) => i % 3, sub = (i) => Math.floor(i / 3);
  const nbDir = [], home = [];
  for (let i = 0; i < NM; i++) {
    const a = i === 0 ? 0.14 : 0.03 + 0.34 * ((i * 0.618) % 1), dz = i === 0 ? 0 : ((i * 0.37) % 1 - 0.5) * 0.45;
    const d = sdir(dD, dE, a).add(V(0, 0, dz / lumR)).normalize(); nbDir.push(d); home.push(sph(d, lumR));
  }
  const cisYZ = [[-2.5, 0.45], [-1.7, 0.5], [-0.9, 0.45]], trYZ = [[-2.4, 0.45], [-1.4, 0.5], [-0.4, 0.45]];
  const nC = V(-1, -0.25, 0).normalize(), nT = V(1, 0, 0);
  const Pc = cisYZ.map(([y, z]) => golgiPt(0, y, z, -0.16)), Pt = trYZ.map(([y, z]) => golgiPt(GK - 1, y, z, 0.16));
  const sites = [-3.3, -0.8, 1.7].map((y) => { const z = 0.45, x = AX.a * Math.sqrt(1 - (y / AX.b) ** 2 - (z / AX.c) ** 2), d = V(x, y, z).normalize();
    const S = d.clone().multiplyScalar(surfR(d) * wob(d)), nOut = gradN(S); return { S, nOut, nIn: nOut.clone().negate() }; });
  const rvE = 0.36, rvT0 = 0.42, rvT1 = 0.62;
  const erCurve = Pc.map((pc) => { const a = E.clone().addScaledVector(dE, rvE + 0.25), b = pc.clone().addScaledVector(nC, rvE + 0.25);
    return new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(V(-0.5, 0, 0.05)), b]); });
  const apCurve = Pt.map((pt, v) => { const s = sites[v], a = pt.clone().addScaledVector(nT, rvT0 + 0.25), b = s.S.clone().addScaledVector(s.nIn, rvT1 + 0.5);
    return new THREE.CatmullRomCurve3([a, a.clone().add(V(2.2, 0, 0)), V(7, (a.y + b.y) / 2 - 0.3, 0.5), V(11.5, b.y, 0.48), b]); });
  const pathPts = [];
  for (let k = 0; k <= 30; k++) pathPts.push(F.clone().lerp(Dc, k / 30));
  for (const c of erCurve) for (let k = 0; k <= 40; k++) pathPts.push(c.getPoint(k / 40));
  for (const c of apCurve) for (let k = 0; k <= 120; k++) pathPts.push(c.getPoint(k / 120));
  const pathClear = (p, rad) => pathPts.every((q) => q.distanceToSquared(p) > rad * rad);
  const nearSite = (p, r) => sites.some((s) => s.S.distanceTo(p) < r);
  const inCell = (p, m = 0.9) => ell(p) < m;

  // =============================== plasma membrane ===============================
  const PATCH = 1.35, pm = [];
  for (const d of fib(42000)) { const p = d.clone().multiplyScalar(surfR(d) * wob(d)); if (nearSite(p, PATCH)) continue; pm.push({ p, s: V(0.13, 0.13, 0.07), n: gradN(p) }); }
  B.inst(GEO.s1, M.pm, pm);
  for (const s of sites) {
    const t1 = V().crossVectors(s.nOut, UP).normalize(), t2 = V().crossVectors(s.nOut, t1); s.patch = [];
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) { const u = (i + (j & 1) * 0.5) * 0.2, w = j * 0.173; const rho = Math.hypot(u, w); if (rho > PATCH) continue;
      const d = s.S.clone().addScaledVector(t1, u).addScaledVector(t2, w).normalize(); const p = d.multiplyScalar(surfR(d) * wob(d)); s.patch.push({ p, rho, n: gradN(p) }); }
  }
  const mv = [];
  for (const d of fib(1400)) { if (d.x < 0.9) continue; const base = d.clone().multiplyScalar(surfR(d) * wob(d)); if (nearSite(base, PATCH + 0.15)) continue; mv.push({ base, nrm: gradN(base), L: rr(1.0, 1.6) }); }
  B.inst(GEO.cyl, M.pm, mv.map((m) => ({ p: m.base.clone().addScaledVector(m.nrm, m.L / 2), s: V(0.16, 0.16, m.L), n: m.nrm })));
  B.inst(GEO.s2, M.pm, mv.map((m) => ({ p: m.base.clone().addScaledVector(m.nrm, m.L), s: 0.16 })));

  // =============================== nucleus ===============================
  anchors.nucleus = N.clone().add(V(0.6, -1.2, 0.8));
  const env = [];
  for (const d of fib(5200)) { env.push({ p: N.clone().addScaledVector(d, NR), s: V(0.1, 0.1, 0.06), n: d }); env.push({ p: N.clone().addScaledVector(d, NR - 0.35), s: V(0.09, 0.09, 0.05), n: d }); }
  B.inst(GEO.s1, M.envelope, env);
  B.inst(new THREE.TorusGeometry(0.2, 0.07, 6, 14), M.envelope, fib(110).map((d) => ({ p: N.clone().addScaledVector(d, NR - 0.17), s: 1, n: d })));
  const chrom = [];
  for (const d of fib(2600)) { if (R() < 0.45) continue; chrom.push({ p: N.clone().addScaledVector(d, NR - rr(0.5, 0.9)), s: rr(0.1, 0.16) }); }
  for (let c = 0; c < 10; c++) { let p = N.clone().add(V(rr(-2, 2), rr(-2, 2), rr(-2, 2))); const pts = [p.clone()];
    for (let k = 0; k < 9; k++) { p = p.clone().add(V(rr(-1, 1), rr(-1, 1), rr(-1, 1))); if (p.distanceTo(N) > NR - 1) p.sub(N).setLength(NR - 1.1).add(N); pts.push(p); }
    const cv = new THREE.CatmullRomCurve3(pts); for (let k = 0; k < 80; k++) chrom.push({ p: cv.getPoint(k / 80), s: rr(0.08, 0.12) }); }
  B.inst(GEO.s1, M.chromatin, chrom);
  const nl = [], NL = N.clone().add(V(0.9, 0.7, -0.5));
  while (nl.length < 900) { const d = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)); if (d.length() <= 1) nl.push({ p: NL.clone().addScaledVector(d, 1.2), s: rr(0.07, 0.13) }); }
  B.inst(GEO.s1, M.nucleolus, nl);

  // =============================== rough ER ===============================
  const erB = [], ribo = [], tlc = [], patchE = [];
  const busy = [Dc, ...nbDir.slice(1).map((d) => sph(d, rO + 0.2))];
  for (const p of busy) tlc.push({ p: p.clone().addScaledVector(p.clone().sub(N).normalize(), -0.2), s: 1, n: p.clone().sub(N).normalize() });
  ERR.forEach((r0) => {
    for (const d of fib(Math.round(4 * Math.PI * r0 * r0 / 0.03))) {
      if (d.x > ERCONE) continue;
      const pIn = N.clone().addScaledVector(d, r0), pOut = N.clone().addScaledVector(d, r0 + LUM);
      if (!inCell(pOut, 0.86) || inGolgi(pOut, 0.9) || !pathClear(pOut, 0.5)) continue;
      erB.push({ p: pIn, s: V(0.1, 0.1, 0.05), n: d });
      if (r0 === ERR[2] && pOut.distanceTo(E) < 0.85) patchE.push({ p: pOut, rho: pOut.distanceTo(E), n: d, s: V(0.1, 0.1, 0.05) }); else erB.push({ p: pOut, s: V(0.1, 0.1, 0.05), n: d });
      const ro = N.clone().addScaledVector(d, r0 + LUM + 0.17);
      if (R() < 0.16 && busy.every((b) => b.distanceTo(ro) > 0.4) && ro.distanceTo(E) > 0.7) ribo.push({ p: ro, s: rr(0.11, 0.14) });
      if (R() < 0.16) ribo.push({ p: N.clone().addScaledVector(d, r0 - 0.17), s: rr(0.11, 0.14) });
    }
  });
  for (const d of fib(14)) { if (d.x > ERCONE) continue;
    for (let r = NR + 0.1; r < ERR[0]; r += 0.12) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, s1 = V().crossVectors(d, UP).normalize(), s2 = V().crossVectors(d, s1);
      erB.push({ p: N.clone().addScaledVector(d, r).addScaledVector(s1, Math.cos(a) * 0.3).addScaledVector(s2, Math.sin(a) * 0.3), s: 0.08 }); } }
  B.inst(GEO.s1, M.er, erB, 0.22); B.inst(GEO.s1, M.ribosome, ribo);
  B.inst(new THREE.TorusGeometry(0.11, 0.045, 6, 12), M.translocon, tlc);
  for (const p of busy.slice(1)) { const ax = p.clone().sub(N).normalize();
    B.inst(GEO.s2, M.ribosome, [{ p: p.clone().addScaledVector(ax, 0.04), s: 0.15 }, { p: p.clone().addScaledVector(ax, 0.2), s: 0.11 }]); }
  const lumCargo = [];
  for (let k = 0; k < 180; k++) { const d = sdir(dD, dE, rr(-0.4, 1.05)).add(V(0, 0, rr(-0.03, 0.03))).normalize(); lumCargo.push({ p: sph(d, lumR + rr(-0.18, 0.18)), s: 0.055 }); }
  B.inst(GEO.s1, M.cargo, lumCargo);

  // =============================== Golgi ===============================
  const golgi = [], gCargo = [], patchC = Pc.map(() => []), patchT = Pt.map(() => []);
  for (let k = 0; k < GK; k++) { const Rk = gR(k);
    for (let y = -Rk; y <= Rk; y += 0.15) for (let z = -Rk; z <= Rk; z += 0.15) { const rho = Math.hypot(y, z); if (rho > Rk) continue;
      if (rho > 0.55 * Rk && rho < 0.9 * Rk && Math.sin(y * 3.1 + k) * Math.cos(z * 2.7 - k) > 0.82) continue;
      const rim = rho > 0.9 * Rk ? 1.7 : 1, x = gX(k, rho);
      for (const sg of [-1, 1]) { const q = { p: V(x + sg * 0.15 * rim, GC.y + y, GC.z + z), s: V(0.08, 0.08, 0.05), n: V(1, 0, 0) };
        const L = k === 0 && sg < 0 ? Pc : k === GK - 1 && sg > 0 ? Pt : null, hit = L ? L.findIndex((c) => c.distanceTo(q.p) < 0.8) : -1;
        if (hit >= 0) { q.rho = q.p.distanceTo(L[hit]); (L === Pc ? patchC : patchT)[hit].push(q); } else golgi.push(q); } }
    for (let j = 0; j < 45; j++) { const a = rr(0, 6.283), rho = rr(0, 0.9 * Rk); gCargo.push({ p: golgiPt(k, Math.cos(a) * rho, Math.sin(a) * rho), s: 0.05 }); } }
  B.inst(GEO.s1, M.golgi, golgi, 0.22); B.inst(GEO.s1, M.cargo, gCargo);
  anchors.golgiRim = golgiPt(2.5, -1.7, 0.45);

  // =============================== cytoplasm contents ===============================
  const free = (p, pad = 0.4) => { if (!inCell(p, 0.82) || !pathClear(p, 0.75 + pad * 0.5) || inGolgi(p, pad) || nearSite(p, 1.9)) return false;
    const dn = p.distanceTo(N), d = p.clone().sub(N).normalize(); return d.x < ERCONE + 0.06 ? dn > rO + 0.5 + pad : dn > NR + 0.6 + pad; };
  const mitos = [];
  const heroMito = { p: V(3.2, -6.4, 0.25), ax: V(1, 0.35, 0).normalize() }; mitos.push(heroMito);
  const place = (pad, zr) => { for (let i = 0; i < 6000; i++) { const p = V(rr(-AX.a, 8.5), rr(-AX.b, AX.b), rr(zr[0], zr[1])), ax = V(rr(-1, 1), rr(-1, 1), rr(-0.3, 0.3)).normalize();
      const ends = [-2.1, -1.05, 0, 1.05, 2.1].map((k) => p.clone().addScaledVector(ax, k));
      if (ends.every((e) => free(e, pad)) && !mitos.some((m) => m.p.distanceTo(p) < 4.4)) return { p, ax }; } return null; };
  for (let i = 0; i < 12; i++) { const m = place(0.5, i < 8 ? [-0.4, 0.5] : [-4, 0]); if (m) mitos.push(m); }
  const mitoOut = [], cristae = [];
  for (const m of mitos) { const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), m.ax); mitoOut.push({ p: m.p, s: 1, q });
    for (let k = -4; k <= 4; k++) cristae.push({ p: m.p.clone().addScaledVector(m.ax, k * 0.34), s: V(0.6, 0.6, 0.05), n: m.ax.clone().applyAxisAngle(UP, rr(-0.25, 0.25)) }); }
  B.inst(new THREE.CapsuleGeometry(0.78, 2.6, 10, 24), M.mitoOut, mitoOut);
  B.inst(new THREE.CapsuleGeometry(0.66, 2.5, 10, 24), M.mitoIn, mitoOut);
  B.inst(GEO.s3, M.mitoCr, cristae);
  anchors.mito = heroMito.p.clone().add(V(0, 0, 0.5));

  const gran = [];
  for (let i = 0; i < 6000 && gran.length < 54; i++) { const p = V(rr(4, 14.5), rr(-7, 7), rr(-5, 0.5)), r = rr(0.6, 0.9);
    if (!inCell(p, 0.72) || !pathClear(p, r + 0.45) || nearSite(p, r + 1.5) || mitos.some((m) => m.p.distanceTo(p) < 2.1) || gran.some((g) => g.p.distanceTo(p) < g.s + r + 0.15)) continue; gran.push({ p, s: r }); }
  const granMem = []; for (const g of gran) for (const d of fibC(150)) granMem.push({ p: g.p.clone().addScaledVector(d, g.s), s: V(0.085, 0.085, 0.05).multiplyScalar(g.s / 0.75), n: d });
  B.inst(GEO.s1, M.granB, granMem); B.inst(GEO.s2, M.granuleC, gran.map((g) => ({ p: g.p, s: g.s * 0.8 })));
  const sv = [];
  for (let i = 0; i < 8000 && sv.length < 18; i++) { const p = V(rr(-5, 2.8), GC.y + rr(-4.5, 4.5), rr(-2.5, 0.55)); if (!free(p, 0.25) || !inGolgi(p, 1.6) || sv.some((q) => q.p.distanceTo(p) < 0.9)) continue; sv.push({ p, s: rr(0.26, 0.34) }); }
  const svMem = []; for (const v of sv) for (const d of fibC(56)) svMem.push({ p: v.p.clone().addScaledVector(d, v.s), s: V(0.07, 0.07, 0.04), n: d });
  B.inst(GEO.s1, M.vesB, svMem); B.inst(GEO.s1, M.cargo, sv.map((v) => ({ p: v.p, s: v.s * 0.45 })));

  for (let i = 0; i < 26; i++) { const y0 = GC.y + rr(-4, 4), z0 = rr(-3.5, 0.55); let p = V(GC.x + 2.4, y0, z0); const pts = [p.clone()];
    for (let k = 0; k < 6; k++) { p = p.clone().add(V(2.0, rr(-0.7, 0.7), rr(-0.3, 0.3))); if (!inCell(p, 0.72) || p.x > 12.5) break; pts.push(p.clone()); }
    if (pts.length > 3) B.tube(pts, 0.045, M.mt); }

  const cyt = [], poly = [];
  for (let i = 0; i < 26000; i++) { const p = V(rr(-AX.a, AX.a), rr(-AX.b, AX.b), rr(-AX.c, 0.8)); if (!free(p, 0.1) || gran.some((g) => g.p.distanceTo(p) < g.s + 0.1) || sv.some((g) => g.p.distanceTo(p) < g.s + 0.1) || mitos.some((m) => m.p.distanceTo(p) < 1.6)) continue;
    if (i % 23 === 0) { const ax = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(); for (let k = 0; k < 5; k++) poly.push({ p: p.clone().addScaledVector(ax, k * 0.26).add(V(Math.cos(k * 1.3) * 0.1, Math.sin(k * 1.3) * 0.1, 0)), s: 0.11 }); }
    else cyt.push({ p, s: rr(0.05, 0.11) }); }
  B.inst(GEO.s1, M.ribosome, poly); B.inst(GEO.s1, M.cyto, cyt, 0.3);
  B.bakeAO();

  // =============================== dynamic actors ===============================
  const P = {
    ribo: new Pool(scene, GEO.s2, M.ribosome, 16), mrna: new Pool(scene, GEO.s1, M.mrna, 160),
    chain: new Pool(scene, GEO.s1, M.tracer, 200), sig: new Pool(scene, GEO.s1, M.signal, 12), blob: new Pool(scene, GEO.s1, M.tracer, 900),
    memE: new Pool(scene, GEO.s1, M.vesB, 260), memS: new Pool(scene, GEO.s1, M.granB, 700), patch: new Pool(scene, GEO.s1, M.pm, 1600),
    cargoU: new Pool(scene, GEO.s1, M.cargo, 400), pE: new Pool(scene, GEO.s1, M.er, 200), pG: new Pool(scene, GEO.s1, M.golgi, 600),
  };
  const tmp = V(), t1v = V(), sc3 = V(), MOL = fib(7);
  const mol = (p, sc) => { if (sc > 0.01) for (const d of MOL) P.blob.add(t1v.copy(p).addScaledVector(d, 0.085 * sc), 0.055 * sc); };
  function shell(pool, c, rv, nv, rref, o, n) {
    for (const d of fibC(nv)) { tmp.copy(c).addScaledVector(d, rv); if (o && t1v.subVectors(tmp, o).dot(n) < 0.02) continue;
      const b = 0.075 * rv / rref; pool.add(tmp, sc3.set(b, b, b * 0.6), d); }
  }
  const budHc = (u, rv) => u < 0.75 ? -0.6 * rv + 1.45 * rv * ease(u / 0.75) : 0.85 * rv + (0.15 * rv + 0.25) * ease((u - 0.75) / 0.25);
  const erS = (v, T) => { const b0 = T.erBud0 + v * T.erBudDur, b1 = b0 + T.erBudDur, r1 = b1 + T.erTransit; return { b0, b1, r1, f1: r1 + T.cisFuse }; };
  const tgS = (v, T) => { const b0 = T.tgnBud0 + v * T.tgnStagger, b1 = b0 + T.tgnBudDur, r1 = b1 + T.tgnTransit, f0 = T.fuse0 + v * T.fuseStagger; return { b0, b1, r1, f0, f1: f0 + T.fuseDur }; };
  const fuseHc = (u, rv) => u < 0.2 ? rv + 0.5 - 0.47 * ease(u / 0.2) : u < 0.35 ? rv + 0.03 - 0.33 * rv * ease((u - 0.2) / 0.15) : 0.7 * rv - 1.7 * rv * ease((u - 0.35) / 0.65);

  function vesER(v, t, T) { const s = erS(v, T);
    if (t < s.b0 || t >= s.f1) return null;
    if (t < s.b1) { const hc = budHc(win(t, s.b0, s.b1), rvE); return { c: E.clone().addScaledVector(dE, hc), rv: rvE, o: E, n: dE, hc, site: 'E' }; }
    if (t < s.r1) return { c: erCurve[v].getPoint(ease(win(t, s.b1, s.r1))), rv: rvE };
    const hc = rvE + 0.25 - (2 * rvE + 0.25) * ease(win(t, s.r1, s.f1)); return { c: Pc[v].clone().addScaledVector(nC, hc), rv: rvE, o: Pc[v], n: nC, hc, site: 'C' }; }
  function vesTG(v, t, T) { const s = tgS(v, T);
    if (t < s.b0 || t >= s.f1) return null;
    if (t < s.b1) { const hc = budHc(win(t, s.b0, s.b1), rvT0); return { c: Pt[v].clone().addScaledVector(nT, hc), rv: rvT0, o: Pt[v], n: nT, hc, site: 'T' }; }
    if (t < s.f0) { const u = ease(win(t, s.b1, s.r1)); return { c: apCurve[v].getPoint(u), rv: rvT0 + (rvT1 - rvT0) * u }; }
    const S = sites[v], hc = fuseHc(win(t, s.f0, s.f1), rvT1); return { c: S.S.clone().addScaledVector(S.nIn, hc), rv: rvT1, o: S.S, n: S.nIn, hc, site: 'S' }; }

  const parts = [];
  for (let i = 0; i < NM; i++) parts.push({ lab: true, i, v: grp(i), off: fibC(4)[sub(i)], sd: sub(i), home: home[i] });
  for (let j = 0; j < 18; j++) { const v = j % 3, off = fibC(10)[4 + (j % 6)]; parts.push({ lab: false, v, off, sd: (j % 6) * 0.5, home: null }); }
  const waitP = (pt) => sph(sdir(dE, dD, 0.05 + 0.025 * (pt.sd % 4)), lumR).add(V(0, 0, pt.off.z * 0.15));
  const cisP = (pt) => golgiPt(0, cisYZ[pt.v][0] + pt.off.y * 0.3, cisYZ[pt.v][1] + pt.off.z * 0.12);
  const golP = (pt, k, f) => { const y = cisYZ[pt.v][0] + (trYZ[pt.v][0] - cisYZ[pt.v][0]) * f + pt.off.y * 0.3, z = cisYZ[pt.v][1] + (trYZ[pt.v][1] - cisYZ[pt.v][1]) * f + pt.off.z * 0.12; return golgiPt(k, y, z); };
  function where(pt, t, T) {
    const se = erS(pt.v, T), st = tgS(pt.v, T), inner = (ves) => ves.c.clone().addScaledVector(pt.off, ves.rv * 0.45);
    if (t < se.b0 + 0.25 * T.erBudDur) {
      const w = waitP(pt); if (!pt.home) return [[w, 1]];
      const u = ease(win(t, T.flow[0], T.flow[1])), a = pt.home.clone().sub(N), b = w.clone().sub(N); return [[N.clone().add(a.normalize().lerp(b.normalize(), u).normalize().multiplyScalar(lumR)), 1]];
    }
    if (t < se.b1) { const ves = vesER(pt.v, t, T); return [[waitP(pt).lerp(inner(ves), ease(win(win(t, se.b0, se.b1), 0.25, 0.7))), 1]]; }
    if (t < se.r1) return [[inner(vesER(pt.v, t, T)), 1]];
    if (t < se.f1) { const ves = vesER(pt.v, t, T); return [[inner(ves).lerp(cisP(pt), ease(win(win(t, se.r1, se.f1), 0.3, 1))), 1]]; }
    if (t < st.b0 + 0.25 * T.tgnBudDur) {
      const lag = 0.2 * pt.sd / 3, kf = clamp01(win(t, T.golgi[0], T.golgi[1]) * 1.2 - lag) * (GK - 1), k0 = Math.floor(Math.min(kf, GK - 1.0001)), f = ease(kf - k0);
      if (kf >= GK - 1) return [[golP(pt, GK - 1, 1), 1]];
      return [[golP(pt, k0, kf / (GK - 1)), 1 - f], [golP(pt, k0 + 1, kf / (GK - 1)), f]];
    }
    if (t < st.b1) { const ves = vesTG(pt.v, t, T); return [[golP(pt, GK - 1, 1).lerp(inner(ves), ease(win(win(t, st.b0, st.b1), 0.25, 0.7))), 1]]; }
    if (t < st.f0) return [[inner(vesTG(pt.v, t, T)), 1]];
    const S = sites[pt.v], u = win(t, st.f0, st.f1), rel = ease(win(u, 0.3 + 0.04 * pt.sd, 0.8 + 0.04 * pt.sd));
    const t1 = V().crossVectors(S.nOut, UP).normalize(), outP = S.S.clone().addScaledVector(S.nOut, 0.7 + 0.35 * (pt.sd % 4)).addScaledVector(t1, pt.off.y * 0.7).add(V(0, 0, pt.off.z * 0.25));
    outP.addScaledVector(S.nOut, 0.05 * Math.max(0, t - st.f1)).addScaledVector(t1, 0.03 * pt.off.x * Math.max(0, t - st.f1));
    if (t < st.f1 && rel <= 0) return [[inner(vesTG(pt.v, t, T)), 1]];
    const ves = t < st.f1 ? vesTG(pt.v, t, T) : null, inP = ves ? inner(ves) : S.S.clone();
    return [[rel < 0.5 ? inP.lerp(S.S, rel * 2) : S.S.clone().lerp(outP, (rel - 0.5) * 2), 1]];
  }

  const repA = [], repB = [], repC = [];
  for (let k = 0; k < 70; k++) { const r0 = ERR[k % 3] + LUM / 2, d = V(rr(-1, ERCONE), rr(-1, 1), 0).normalize(); d.z = rr(0.2, 0.65) / r0; const p = sph(d, r0); if (inCell(p, 0.86) && !inGolgi(p, 0.9)) repA.push(p); }
  for (let k = 0; k < 60; k++) { const kk = k % GK, a = rr(0, 6.283), rho = rr(0.3, 0.9 * gR(kk)); repB.push(golgiPt(kk, Math.cos(a) * rho, Math.min(0.55, Math.sin(a) * rho))); }
  gran.filter((g) => g.p.x > 9 && g.p.z > -1.5).slice(0, 16).forEach((g) => { for (let k = 0; k < 8; k++) repC.push(g.p.clone().addScaledVector(fibC(8)[k], g.s * 0.45)); });
  for (const st of sites) for (let k = 0; k < 14; k++) repC.push(st.S.clone().addScaledVector(st.nOut, rr(0.6, 2.4)).add(V(0, rr(-1, 1), rr(-0.5, 0.6))));

  function update(t, T) {
    Object.values(P).forEach((p) => p.begin());
    const uT = win(t, ...T.translate), uD = ease(win(t, ...T.dock)), uL = win(t, ...T.lumen);
    const ribPos = F.clone().lerp(Dc, uD), axis = V(1, 0, 0).lerp(dD.clone().negate(), uD).normalize();
    if (t < T.flow[0]) {
      const s = V().crossVectors(axis, UP).normalize();
      P.ribo.add(ribPos.clone().addScaledVector(axis, 0.04), 0.15); P.ribo.add(ribPos.clone().addScaledVector(s, 0.08), 0.1); P.ribo.add(ribPos.clone().addScaledVector(s, -0.08).addScaledVector(axis, 0.03), 0.1);
      P.ribo.add(ribPos.clone().addScaledVector(axis, -0.17), 0.11); P.ribo.add(ribPos.clone().addScaledVector(axis, -0.17).addScaledVector(s, 0.09), 0.08);
      const slide = (uT + uD + Math.min(uL, 0.6)) * 0.45;
      for (let k = -50; k <= 50; k++) P.mrna.add(ribPos.clone().addScaledVector(s, k * 0.03 + slide).addScaledVector(axis, -0.17 + Math.sin(k * 0.3) * 0.02), 0.022);
    } else if (t < T.flow[1]) { const u = ease(win(t, ...T.flow)), base = Dc.clone().addScaledVector(dD, 0.15 + 1.3 * u);
      P.ribo.add(base.clone().addScaledVector(tD, 0.35 * u), 0.15); P.ribo.add(base.clone().addScaledVector(tD, -0.35 * u).addScaledVector(dD, 0.1), 0.11); }

    const Fc = home[0], cf = ease(win(t, T.lumen[1] - 0.45, T.lumen[1]));
    if (t >= T.translate[0] && t < T.lumen[1]) {
      const n = Math.round(18 * uT) + Math.round(60 * Math.min(1, uL / 0.6)), exitP = ribPos.clone().addScaledVector(axis, 0.2);
      const dk = ease(win(uD, 0.55, 1)), cleave = ease(win(uL, 0.45, 0.6)), fold = ease(win(uL, 0.65, 1)), Lm = Math.max(1, n - 6);
      for (let j = 0; j < n; j++) {
        const q = n - 1 - j, straight = exitP.clone().addScaledVector(axis, q * 0.035).add(V(0, Math.sin(q * 0.7) * 0.025, Math.cos(q * 0.6) * 0.025));
        let docked;
        if (j < 6) docked = Dm.clone().addScaledVector(tD, 0.13).addScaledVector(dD, 0.12 - j * 0.048);
        else { const m = j - 6, s = Lm > 1 ? m / (Lm - 1) : 0, span = Lm * 0.0125, arc = span * (1 - Math.cos(2 * Math.PI * s)) / 2;
          const d = sdir(dD, dE, Math.min(0.9, arc / (thDE * lumR))); docked = sph(d, lumR + 0.1 * Math.sin(m * 0.5)).add(V(0, 0, 0.16 * Math.sin(2 * Math.PI * s) + 0.05 * Math.sin(m * 0.9)));
          if (s > 0.9) docked.lerp(Dm.clone().addScaledVector(dD, -0.15), (s - 0.9) / 0.1); }
        const p = straight.lerp(docked, dk);
        if (j >= 6 && fold > 0) p.lerp(Fc.clone().addScaledVector(fibC(Math.max(8, Lm))[(j - 6) % Math.max(8, Lm)], 0.13), fold);
        if (j < 6) { if (cleave < 1) P.sig.add(p, 0.034 * (1 - cleave)); } else P.chain.add(p, 0.032 * (1 - cf));
      }
    }
    for (const pt of parts) {
      if (pt.lab) {
        let sc = 1;
        if (pt.i === 0) { if (t < T.lumen[1] - 0.45) continue; sc = cf; }
        else { const g = ease(win(t, T.dock[0] + pt.i * 0.35, T.lumen[1] - 2.5 + pt.i * 0.15)); if (g <= 0) continue; sc = g;
          if (g < 1) { const rib = sph(nbDir[pt.i], rO + 0.2); for (let k = 0; k < 4; k++) P.chain.add(rib.clone().lerp(home[pt.i], (k + 1) / 5), 0.03); } }
        if (T.replay) sc *= 1 - ease(win(t, T.replay[0] - 2.4, T.replay[0] - 1.2));
        for (const [p, s] of where(pt, t, T)) mol(p, s * sc);
      } else { if (t < T.flow[0]) continue; const f = ease(win(t, T.flow[0], T.flow[0] + 0.8)); for (const [p, s] of where(pt, t, T)) P.cargoU.add(p, 0.06 * s * f); }
    }
    for (let v = 0; v < 3; v++) {
      const a = vesER(v, t, T); if (a) shell(P.memE, a.c, a.rv, 56, rvE, a.o, a.n);
      const b = vesTG(v, t, T); if (b) shell(P.memS, b.c, b.rv, 170, rvT1, b.o, b.n);
    }
    const drawPatch = (pts, o, nSide, hc, rv, pool) => { const rn = Math.abs(hc) < rv ? Math.sqrt(rv * rv - hc * hc) : 0;
      for (const q of pts) { if (q.rho < rn) continue; const lip = rn > 0 ? Math.min(0.28, rv * 0.5) * Math.max(0, 1 - (q.rho - rn) / (rv * 0.65)) ** 2 * Math.min(1, rn / 0.15) : 0;
        pool.add(tmp.copy(q.p).addScaledVector(nSide, lip), q.s || sc3.set(0.13, 0.13, 0.07), q.n); } };
    let eHc = 99; const cHc = [99, 99, 99], tHc = [99, 99, 99], sHc = [99, 99, 99];
    for (let v = 0; v < 3; v++) { const a = vesER(v, t, T); if (a && a.site === 'E') eHc = a.hc; if (a && a.site === 'C') cHc[v] = a.hc;
      const b = vesTG(v, t, T); if (b && b.site === 'T') tHc[v] = b.hc; if (b && b.site === 'S') sHc[v] = b.hc; }
    drawPatch(patchE, E, dE, eHc, rvE, P.pE);
    for (let v = 0; v < 3; v++) { drawPatch(patchC[v], Pc[v], nC, cHc[v], rvE, P.pG); drawPatch(patchT[v], Pt[v], nT, tHc[v], rvT0, P.pG); drawPatch(sites[v].patch, sites[v].S, sites[v].nIn, sHc[v], rvT1, P.patch); }
    if (T.replay && t > T.replay[0] - 0.6) { const [r0, r1, r2] = T.replay;
      const a = ease(win(t, r0 - 0.4, r0 + 0.3)) * (1 - ease(win(t, r1, r1 + 0.7))), b = ease(win(t, r1 - 0.2, r1 + 0.5)) * (1 - ease(win(t, r2, r2 + 0.7))), c = ease(win(t, r2 - 0.2, r2 + 0.5));
      if (a > 0.01) for (const p of repA) P.blob.add(p, 0.16 * a); if (b > 0.01) for (const p of repB) P.blob.add(p, 0.16 * b); if (c > 0.01) for (const p of repC) P.blob.add(p, 0.2 * c); }
    Object.values(P).forEach((p) => p.end());
  }

  // real model state for data panels: where each labeled molecule is right now (counts, not invented numbers)
  function census(t, T) {
    const c = { notYet: 0, er: 0, toGolgi: 0, golgi: 0, toPM: 0, outside: 0 };
    for (const pt of parts) { if (!pt.lab) continue; const se = erS(pt.v, T), st = tgS(pt.v, T);
      const made = pt.i === 0 ? T.translate[0] : T.dock[0] + pt.i * 0.35;
      if (t < made) c.notYet++; else if (t < se.b0 + 0.75 * T.erBudDur) c.er++; else if (t < se.f1) c.toGolgi++;
      else if (t < st.b0 + 0.75 * T.tgnBudDur) c.golgi++; else if (t < st.f0 + 0.35 * T.fuseDur) c.toPM++; else c.outside++; }
    return c;
  }
  Object.assign(anchors, { ribosome: F.clone(), dock: Dc.clone(), lumen: home[0].clone(), exit: E.clone(), apexSite: sites[1].S.clone().addScaledVector(sites[1].nIn, 0.4), center: V(1, 0, -1) });
  anchors.riboMove = (t, T) => F.clone().lerp(Dc, ease(win(t, ...T.dock)));
  anchors.cohort = (t, T) => { const c = V(); let n = 0; for (const pt of parts) if (pt.lab) for (const [p, s] of where(pt, t, T)) { c.addScaledVector(p, s); n += s; } return n ? c.multiplyScalar(1 / n) : home[0].clone(); };
  return { anchors, update, census, cohortSize: NM, count: B.count, palette: PALETTE };
}
