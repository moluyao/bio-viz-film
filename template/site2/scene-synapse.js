// Scene: glutamatergic chemical synapse in hippocampal neuropil (CA1-like), TRUE scale. 1 unit = 20 nm.
// Sizes (see review/事实表_突触.md): vesicle Ø40 nm (r 1.0) · cleft 20 nm (1.0) · PSD 30-50 nm thick, Ø~300 nm · bouton ~0.8 µm ·
// spine head ~0.5-0.6 µm, neck Ø~110 nm · AMPA receptor protrudes ~13 nm into the cleft · ~200 vesicles, ~4,000 glutamate each.
// Process: action potential → Ca²⁺ channels open → one docked vesicle fuses (full collapse) → glutamate diffuses across the cleft →
// AMPA receptors open (Na⁺ in) → glutamate leaves the cleft, taken up by astrocyte transporters → clathrin endocytosis, refill, re-dock.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { V, UP, ease, win, clamp01, Builder, Pool, fbm, gridGeometry, keepify, bentCapsule, GEO, capify, flipWinding } from './lib.js';

export const PALETTE = {
  axon: '#22c983', vesicle: '#ffd23a', glu: '#ff6a00', dp: '#0c8a5e', vgcc: '#0096c7', ca: '#2ee6ff',
  den: '#8c6cff', psd: '#4626c4', ampa: '#ff4f8b', ampaOpen: '#ff0a54', na: '#b4ff2e', actin: '#b7a6ff', sa: '#36b8ff',
  astro: '#a9bfd6', eaat: '#40566f', mitoOut: '#ff6b5e', mitoIn: '#d93a33', mt: '#8f9cff', clathrin: '#34407a', adh: '#c9bfff', dyn: '#ffb020',
  axon2: '#93e3c0', den2: '#c3b6ff', astro2: '#d3dfeb', vesicle2: '#ffe591', psd2: '#6a4fd6', ap: '#ffe100',
};

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
const ss = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const segD = (p, a, b) => { const ab = b.clone().sub(a), t = clamp01(p.clone().sub(a).dot(ab) / ab.lengthSq()); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
const polyD = (p, pts) => { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, segD(p, pts[i], pts[i + 1])); return m; };
function segSeg(p1, q1, p2, q2) { // closest distance between two segments
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2), a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t; const c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
  s = den > 1e-9 ? clamp01((b * f - c * e) / den) : 0; t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
  return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
}

export function build(scene, seed) {
  const b = new Builder(scene, seed), R = b.R, rr = (a, c) => a + (c - a) * R();
  const gauss = () => Math.sqrt(-2 * Math.log(1 - R() * 0.999)) * Math.cos(2 * Math.PI * R());
  const M = {};
  const mk = (k, o = {}) => (M[k] = keepify(b.mat(PALETTE[k], o)));
  ['axon', 'den', 'astro', 'axon2', 'den2', 'astro2', 'mitoOut', 'mitoIn', 'sa', 'psd', 'psd2', 'actin', 'mt', 'vesicle', 'vesicle2', 'dp', 'vgcc', 'ampa', 'eaat', 'adh', 'dyn'].forEach((k) => mk(k));
  ['axon', 'den', 'vesicle'].forEach((k) => { M[k] = keepify(capify(b.mat(PALETTE[k]))); });
  // a membrane as a closed 5 nm bilayer shell: outer face outward, inner face offset inward (gridGeometry winding faces inward)
  const shell = (g, th = 0.25) => { g.computeVertexNormals(); const inner = g.clone(), pa = inner.attributes.position.array, nr = g.attributes.normal;
    for (let i = 0; i < nr.count; i++) { pa[i * 3] += nr.getX(i) * th; pa[i * 3 + 1] += nr.getY(i) * th; pa[i * 3 + 2] += nr.getZ(i) * th; } inner.computeVertexNormals(); return mergeGeometries([flipWinding(g.clone()), inner]); };
  const vesGeo = (det) => { const o = new THREE.IcosahedronGeometry(1, det), i = flipWinding(new THREE.IcosahedronGeometry(0.76, det)); o.deleteAttribute('uv'); i.deleteAttribute('uv'); return mergeGeometries([o, i]); };
  const glowMat = (k, ei) => (M[k] = b.mat(PALETTE[k], { emissive: PALETTE[k], emissiveIntensity: ei, roughness: 0.3 }));
  glowMat('glu', 1.1); glowMat('ca', 1.4); glowMat('na', 1.2); glowMat('ap', 2.2); glowMat('ampaOpen', 1.8);
  M.vgccOpen = b.mat(PALETTE.ca, { emissive: PALETTE.ca, emissiveIntensity: 0.8 });
  M.clathrin = b.mat(PALETTE.clathrin, { transparent: true, opacity: 1, roughness: 0.25 });
  M.glu.side = THREE.FrontSide; M.ca.side = THREE.FrontSide; M.na.side = THREE.FrontSide;
  M.axon.emissive = new THREE.Color(PALETTE.ap); M.axon.emissiveIntensity = 0; M.den.emissive = new THREE.Color(PALETTE.na); M.den.emissiveIntensity = 0;
  const addMesh = (geo, m) => b.mesh(geo, m);
  const prims = []; // collision primitives {a,b,r} (segment) — used to pack the neuropil without intersections
  const seg = (a, c, r, tag) => prims.push({ a, b: c, r, tag });
  const clear = (a, c, r, gap = 1.0, skip) => prims.every((q) => q.tag === skip && skip != null || segSeg(a, c, q.a, q.b) > r + q.r + gap);
  const unitIco = (d) => new THREE.IcosahedronGeometry(1, d);

  // generic blob: ellipsoid (local axes ax, ay, az; local +x = dir), flattened at local x ≤ fx (synaptic contact), optional noise, holes via kfn
  function blobGeo({ c, dir = V(1, 0, 0), ax, ay, az, fx = 1e9, noise = 0, mask, kfn, nu = 90, nv = 180 }) {
    const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir.clone().normalize());
    const g = gridGeometry(nu, nv, (u, v) => { const th = u * Math.PI, ph = v * Math.PI * 2;
      const n = V(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); const pl = V(ax * n.x, ay * n.y, az * n.z);
      if (noise) { const m = mask ? mask(pl) : 1; if (m > 0) pl.addScaledVector(n, (fbm(pl.x * 0.09 + c.x, pl.y * 0.09 + c.y, pl.z * 0.09 + 7) - 0.5) * 2 * noise * m); }
      pl.x = smin(pl.x, fx, 2); const p = pl.applyQuaternion(q).add(c);
      return { p, k: kfn ? kfn(p) : 1 }; }, true);
    return g;
  }
  const ellIn = (c, dir, ax, ay, az) => { const q = new THREE.Quaternion().setFromUnitVectors(dir.clone().normalize(), V(1, 0, 0));
    return (p) => { const l = p.clone().sub(c).applyQuaternion(q); return (l.x / ax) ** 2 + (l.y / ay) ** 2 + (l.z / az) ** 2; }; };
  function tubeGeo(pts, r, nu, nv, kfn) { const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(nu, false);
    return gridGeometry(nu, nv, (u, v) => { const i = Math.round(u * nu), c = curve.getPointAt(u), a = v * Math.PI * 2, rad = typeof r === 'function' ? r(u) : r;
      const p = c.addScaledVector(fr.normals[i], Math.cos(a) * rad).addScaledVector(fr.binormals[i], Math.sin(a) * rad); return { p, k: kfn ? kfn(p) : 1 }; }, true); }
  const cylBetween = (a, c, r) => ({ p: a.clone().add(c).multiplyScalar(0.5), s: V(r, r, a.distanceTo(c)), n: c.clone().sub(a).normalize() });

  // ======================= MAIN SYNAPSE =======================
  const Bc = V(-18, 0, 0), BA = [22, 21, 17], Sc = V(11, 0, 0), SA = [14, 15, 13];
  const F = V(-0.5, 0, 0.8);                    // fusion site on the presynaptic membrane (plane x = -0.5), centred in the section
  const E = V(-18 + 22 * Math.sqrt(1 - (15 / 21) ** 2 - (0.8 / 17) ** 2), -15, 0.8); // endocytic site, periactive zone
  const nOutE = V((E.x - Bc.x) / BA[0] ** 2, E.y / BA[1] ** 2, E.z / BA[2] ** 2).normalize(), nInE = nOutE.clone().negate();
  const axC = (y) => V(-22 + 2 * Math.sin(y / 45), y, -52 * ss(55, 160, Math.abs(y)));
  const axPts = []; for (let y = -175; y <= 175; y += 5) axPts.push(axC(y));
  const neckPts = [V(21, 0, 0), V(26, 0.3, -0.2), V(34, 1.5, -0.6), V(42, 2.4, -1), V(51, 2.8, -1.2)];
  const shC = (y) => V(62 + 2 * Math.sin(y / 50), y, 0), RSH = 16;
  const shPts = []; for (let y = -172; y <= 172; y += 4) shPts.push(shC(y));
  const eB = ellIn(Bc, V(1, 0, 0), ...BA), eS = ellIn(Sc, V(-1, 0, 0), ...SA);
  // bouton (en-passant swelling of the axon) — holes: axon lumen, fusion site, endocytic site (patches fill the last two)
  addMesh(shell(blobGeo({ c: Bc, ax: BA[0], ay: BA[1], az: BA[2], fx: 17.5, noise: 0.7, mask: (pl) => ss(-1, -6, pl.x + Bc.x) * ss(6, 10, pl.clone().add(Bc).distanceTo(E)), nu: 200, nv: 380,
    kfn: (p) => Math.min(polyD(p, axPts) - 3, p.distanceTo(F) - 2.4, p.distanceTo(E) - 3.2) })), M.axon);
  addMesh(shell(tubeGeo(axPts, 3, 520, 28, (p) => eB(p) - 0.985)), M.axon);
  // spine head (flattened against the cleft), neck, dendrite shaft
  addMesh(shell(blobGeo({ c: Sc, dir: V(-1, 0, 0), ax: SA[0], ay: SA[1], az: SA[2], fx: 10.5, noise: 0.5, mask: (pl) => ss(6, 9, pl.x), nu: 160, nv: 300, kfn: (p) => polyD(p, neckPts) - 2.8 })), M.den);
  addMesh(shell(tubeGeo(neckPts, (u) => 2.8 + 0.5 * ss(0.75, 1, u), 120, 28, (p) => Math.min(eS(p) - 1, polyD(p, shPts) - RSH))), M.den);
  addMesh(shell(tubeGeo(shPts, RSH, 600, 120, (p) => polyD(p, neckPts) - 2.9)), M.den);
  for (let i = 0; i < axPts.length - 1; i++) seg(axPts[i], axPts[i + 1], 3.5);
  seg(V(-24, 0, 0), V(-12, 0, 0), 22); seg(V(8, 0, 0), V(14, 0, 0), 16); seg(V(-9, 0, 0), V(12, 0, 0), 23.5); seg(neckPts[0], neckPts[4], 3.2);
  for (let i = 0; i < shPts.length - 1; i += 2) seg(shPts[i], shPts[Math.min(i + 2, shPts.length - 1)], RSH + 0.5, 'sh1');

  // active zone: dense projections on a hex lattice, docked vesicles in between, Ca²⁺ channels next to them
  const dpPos = [], dock = [[0, 0.8]], A = 4.4; // dock[0] = the vesicle that will fuse, centred on the section plane
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const y = i * A + j * A / 2 + A / 2, z = j * A * 0.866 + A * 0.289; if (Math.hypot(y, z) < 6.6) dpPos.push([y, z]); }
  const cents = []; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (const s of [0, 1]) { const y = i * A + j * A / 2 + (s ? A : A / 2), z = j * A * 0.866 + (s ? A * 0.577 : 0) - (s ? 0 : 0); cents.push([y, z]); }
  cents.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
  for (const c of cents) { if (dock.length >= 10) break; if (dpPos.every((d) => Math.hypot(d[0] - c[0], d[1] - c[1]) > 1.9) && dock.every((d) => Math.hypot(d[0] - c[0], d[1] - c[1]) > 2.1)) dock.push(c); }
  b.inst(new THREE.ConeGeometry(0.75, 2.0, 14).rotateX(-Math.PI / 2).translate(0, 0, 1.0), M.dp, dpPos.map(([y, z]) => ({ p: V(-0.5, y, z), s: 1, n: V(-1, 0, 0) })), 0.1);
  const vgcc = []; for (let k = 0; k < 400 && vgcc.length < 40; k++) { const a = R() * Math.PI * 2, r = 6.8 * Math.sqrt(R()), y = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dock.every((d) => Math.hypot(d[0] - y, d[1] - z) > 1.15) && dpPos.every((d) => Math.hypot(d[0] - y, d[1] - z) > 1.05) && vgcc.every((c) => Math.hypot(c.y - y, c.z - z) > 0.8)) vgcc.push({ y, z }); }
  vgcc.forEach((c) => { const d = Math.hypot(c.y - F.y, c.z - F.z); c.open = R() < 0.95 * Math.exp(-((d / 4.2) ** 2)) + 0.08; c.t = R(); });
  // AMPA receptors on the postsynaptic membrane (x = 0.5), extracellular part reaching ~13 nm into the cleft
  const ampaGeo = (() => { const parts = [new THREE.CylinderGeometry(0.2, 0.22, 0.32, 10).rotateX(Math.PI / 2).translate(0, 0, -0.08), new THREE.IcosahedronGeometry(0.2, 1).scale(1.35, 1, 0.8).translate(0, 0, 0.27),
      new THREE.IcosahedronGeometry(0.16, 1).translate(0.14, 0, 0.62), new THREE.IcosahedronGeometry(0.16, 1).translate(-0.14, 0, 0.62)].map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; });
    return mergeGeometries(parts); })();
  const ampa = []; for (let k = 0; k < 3000 && ampa.length < 76; k++) { const syn = ampa.length < 60, a = R() * Math.PI * 2, r = syn ? 7.2 * Math.sqrt(R()) : rr(7.6, 9.4), y = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ampa.every((c) => Math.hypot(c.y - y, c.z - z) > 0.78)) ampa.push({ y, z, syn }); }
  ampa.forEach((c) => { const d = Math.hypot(c.y - F.y, c.z - F.z); c.d = d; c.opens = c.syn && R() < 0.88 * Math.exp(-((d / 4.6) ** 2)); c.r = R(); c.r2 = R(); });
  // transsynaptic adhesion complexes bridging the cleft
  const adh = []; for (let k = 0; k < 2000 && adh.length < 22; k++) { const a = R() * Math.PI * 2, r = rr(1.6, 9.2), y = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ampa.every((c) => Math.hypot(c.y - y, c.z - z) > 0.55) && adh.every((c) => Math.hypot(c.y - y, c.z - z) > 1.2)) adh.push({ y, z }); }
  b.inst(GEO.cyl, M.adh, adh.map(({ y, z }) => ({ p: V(0, y, z), s: V(0.11, 0.11, 0.96), n: V(1, 0, 0) })), 0.1);
  // PSD: dense protein meshwork 30-50 nm thick under the postsynaptic membrane
  const psd = []; for (let k = 0; k < 9000 && psd.length < 3200; k++) { const y = rr(-9, 9), z = rr(-9, 9), rim = 7.4 * (0.86 + 0.3 * fbm(y * 0.25, z * 0.25, 3)); if (Math.hypot(y, z) > rim) continue;
    psd.push({ p: V(rr(0.78, 0.78 + 1.6 * (1 - 0.4 * Math.hypot(y, z) / rim)), y, z), s: rr(0.26, 0.42) }); }
  b.inst(GEO.s1, M.psd, psd, 0.25);
  // spine apparatus (stacked smooth-ER cisternae with dense plates) + ER tubule through the neck
  [[16.4, 3.3], [17.9, 2.9], [19.3, 2.4]].forEach(([x, r]) => b.mesh(GEO.s3, M.sa).scale.set(0.28, r, r * 0.92) && 0);
  b.scene.children.slice(-3).forEach((m, k) => m.position.set([16.4, 17.9, 19.3][k], 0.2, -0.6));
  b.inst(GEO.cyl, M.psd, [17.15, 18.6].map((x, k) => ({ p: V(x, 0.2, -0.6), s: V(2.6 - 0.4 * k, 2.6 - 0.4 * k, 0.12), n: V(1, 0, 0) })), 0);
  addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(19.6, 0.2, -0.6), V(26, 0.4, -0.4), V(34, 1.5, -0.7), V(42, 2.3, -1.1), V(54, 2.9, -1.6), V(60, 8, -3)]), 90, 0.6, 8), M.sa);
  // actin meshwork in the spine head (filaments ~7 nm)
  const act = []; for (let k = 0; k < 20000 && act.length < 900; k++) { const p = V(rr(2.8, 24), rr(-14, 14), rr(-12, 12)); if (eS(p) > 0.82) continue; if (p.distanceTo(V(18, 0.2, -0.6)) < 4.6) continue;
    const d = V(gauss(), gauss(), gauss()).normalize(), L = rr(1.6, 4.2), q2 = p.clone().addScaledVector(d, L); if (eS(q2) > 0.86 || q2.x < 2.8 || q2.distanceTo(V(18, 0.2, -0.6)) < 4.6) continue; act.push(cylBetween(p, q2, 0.17)); }
  b.inst(GEO.cyl, M.actin, act, 0.2);

  // mitochondria (outer + inner membrane + lamellar cristae attached to the inner membrane)
  function mito(pts, r) { const curve = new THREE.CatmullRomCurve3(pts); addMesh(bentCapsule(curve, r, 90, 28), M.mitoOut); addMesh(bentCapsule(curve, r * 0.86, 90, 28), M.mitoIn);
    const L = curve.getLength(), n = Math.floor(L / 2.6), cr = [];
    for (let i = 1; i < n; i++) { const u = i / n, prof = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 6)), 1 / 6); if (prof < 0.8) continue;
      cr.push({ p: curve.getPointAt(u).add(V(rr(-0.2, 0.2), rr(-0.2, 0.2), rr(-0.2, 0.2))), s: V(r * 0.86 * prof * 0.99, r * 0.86 * prof * 0.99, 0.32), n: curve.getTangentAt(u) }); }
    b.inst(new THREE.CylinderGeometry(1, 1, 1, 24).rotateX(Math.PI / 2), M.mitoIn, cr, 0.05);
    for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], r + 0.4, 'mito'); }
  const mitoB = [V(-30, -11, 0.2), V(-31, -3, -0.3), V(-30.5, 5, 0), V(-29.5, 11, 0.4)]; mito(mitoB, 4);
  // microtubules: through the axon (and bouton), along the dendrite shaft
  const mtPts = []; for (const [ox, oz] of [[0.9, 0.8], [-1.0, 0.3], [0.2, -1.15]]) { const pts = axPts.map((p) => p.clone().add(V(ox, 0, oz))); mtPts.push(pts); addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.62, 8), M.mt); }
  const shMito = [[5, -4, 18, 96], [-5, -6, -102, -22]];
  shMito.forEach(([ox, oz, y0, y1]) => { const pts = []; for (let y = y0; y <= y1; y += 13) pts.push(shC(y).add(V(ox + 0.8 * Math.sin(y / 9), 0, oz))); mito(pts, 4.4); });
  for (let k = 0, n = 0; k < 400 && n < 15; k++) { const a = R() * Math.PI * 2, r = 12.5 * Math.sqrt(R()), ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    if (shMito.some(([mx, mz]) => Math.hypot(ox - mx, oz - mz) < 6.2) || Math.hypot(ox + 9, oz + 1.5) < 4) continue; n++;
    addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shPts.map((p) => p.clone().add(V(ox, 0, oz)))), 300, 0.62, 8), M.mt); }

  // perisynaptic astrocyte process: a thin sheet curving around the synapse, glutamate transporters on its inner face
  const AR = 21, AT = 1.3, AX0 = 1.5, AL = 10.5, a0 = -1.2, a1 = 4.34;
  const astroGeo = gridGeometry(180, 64, (u, v) => { const a = a0 + (a1 - a0) * u, prof = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 8)), 1 / 8), w = v * Math.PI * 2;
    const cx = Math.cos(w), sx = Math.sin(w), px = Math.sign(cx) * Math.pow(Math.abs(cx), 0.3) * AL * prof, pr = Math.sign(sx) * Math.pow(Math.abs(sx), 0.3) * AT * prof;
    const R0 = AR + 0.9 * (fbm(a * 2, px * 0.15, 5) - 0.5) + pr; return { p: V(AX0 + px, Math.cos(a) * R0, Math.sin(a) * R0), k: 1 }; }, true);
  addMesh(astroGeo, M.astro);
  const eaat = []; for (let k = 0; k < 2000 && eaat.length < 260; k++) { const a = a0 + 0.1 + (a1 - a0 - 0.2) * R(), x = AX0 + rr(-AL * 0.85, AL * 0.85), R0 = AR + 0.9 * (fbm(a * 2, (x - AX0) * 0.15, 5) - 0.5) - AT * 0.98;
    eaat.push({ p: V(x, Math.cos(a) * R0, Math.sin(a) * R0), s: rr(0.3, 0.42), n: V(0, -Math.cos(a), -Math.sin(a)) }); }
  b.inst(new THREE.IcosahedronGeometry(1, 1).scale(1, 1, 0.8), M.eaat, eaat, 0.15);

  // synaptic vesicles: ~200 per bouton, clustered behind the active zone; 10 docked
  const ves = dock.map(([y, z]) => V(-1.5, y, z));
  const inBout = (p) => eB(p) < 0.78 && p.distanceTo(E.clone().addScaledVector(nInE, 3.2)) > 4.2 && p.x < -3.3 && polyD(p, mitoB) > 5.4 && Math.min(...mtPts.map((m) => polyD(p, m))) > 1.8;
  for (let k = 0; k < 60000 && ves.length < 200; k++) { const p = V(rr(-38, -3.3), rr(-18, 18), rr(-15, 15)); if (!inBout(p)) continue;
    if (R() > Math.exp(-Math.max(0, p.distanceTo(V(-6, 0, 0)) - 4) / 7)) continue; if (ves.some((q) => q.distanceToSquared(p) < 2.1 * 2.1)) continue; ves.push(p); }
  const vesMesh = b.inst(vesGeo(3), M.vesicle, ves.map((p) => ({ p, s: 1 })), 0.12);
  // glutamate inside every vesicle the section cuts open (~4,000 per vesicle; molecule Ø ~0.8 nm drawn)
  const NG = 4000, ballPts = []; for (let i = 0; i < NG; i++) { let q; do q = V(rr(-1, 1), rr(-1, 1), rr(-1, 1)); while (q.lengthSq() > 1); ballPts.push(q); }
  const fill = []; ves.forEach((c, i) => { if (i === 0 || Math.abs(c.z - 0.8) > 0.95) return; for (let k = 0; k < NG; k += 1) fill.push({ p: c.clone().addScaledVector(ballPts[(k * 7 + i * 131) % NG], 0.7), s: 0.022 }); });
  b.inst(GEO.s0, M.glu, fill, 0.2);
  const endoVesIdx = -1; void endoVesIdx;
  const repIdx = (() => { let bi = -1, bd = 1e9; ves.forEach((p, i) => { if (i < 10) return; const d = p.distanceTo(V(-1.5, 0, 0)); if (d < bd) { bd = d; bi = i; } }); return bi; })();

  // ======================= NEUROPIL AROUND IT =======================
  const BOX = 170, ZB = -50;
  // background dendrites (dip under each other where they cross) + spines with their synapses
  const g26 = (u) => Math.exp(-((u / 26) ** 2));
  const dens = [
    { pts: shPts, r: RSH, axis: 'y', tag: 'sh1', main: true },
    { pts: Array.from({ length: 87 }, (_, i) => { const x = -172 + i * 4; return V(x, -118 + 3 * Math.sin(x / 40), -8 - 34 * g26(x - 62) - 34 * g26(x + 125)); }), r: 12, axis: 'x', tag: 'd2' },
    { pts: Array.from({ length: 87 }, (_, i) => { const y = -172 + i * 4; return V(-125 + 3 * Math.sin(y / 45), y, -6); }), r: 12.5, axis: 'y', tag: 'd3' },
  ];
  dens.slice(1).forEach((d) => { for (let i = 0; i < d.pts.length - 1; i += 2) seg(d.pts[i], d.pts[Math.min(i + 2, d.pts.length - 1)], d.r + 0.5, d.tag); });
  const spines = [], bgBout = [], bgAx = [], bgVes = [], bgPsd = [];
  for (const d of dens) for (let k = 0; k < 90 && spines.filter((s) => s.d === d).length < (d.main ? 9 : 10); k++) {
    const i = 3 + Math.floor(R() * (d.pts.length - 6)), a = d.pts[i]; if (a.z < -12) continue; if (d.main && Math.abs(a.y) < 34) continue;
    const side = R() < 0.5 ? 1 : -1, dir = (d.axis === 'y' ? V(side, 0, rr(-0.3, 0.3)) : V(0, side, rr(-0.3, 0.3))).normalize();
    const rn = rr(1.6, 2.3), L = rr(3, 9), rh = rr(5.5, 9), ax = rh * 0.9, h = a.clone().addScaledVector(dir, d.r + L + ax * 0.8), fx = 0.7 * ax, P = h.clone().addScaledVector(dir, fx);
    const rb = rr(6, 9.5), axb = rb * 0.95, bc = P.clone().addScaledVector(dir, 1 + 0.7 * axb), n0 = a.clone().addScaledVector(dir, d.r - 1.5), n1 = h.clone();
    const av = V(rr(-0.25, 0.25), rr(-0.25, 0.25), 1).normalize(), ra = rr(2, 2.8), A0 = bc.clone().addScaledVector(av, (ZB - 2 - bc.z) / av.z), A1 = bc.clone().addScaledVector(av, (3 - bc.z) / av.z);
    if (Math.max(Math.abs(bc.x), Math.abs(bc.y), Math.abs(h.x), Math.abs(h.y)) > BOX - 12) continue;
    if (!clear(n0.clone().addScaledVector(dir, d.r * 0.8), n1, rn, 1, d.tag) || !clear(h, h, rh, 1) || !clear(bc, bc, rb, 1) || !clear(A0, A1, ra, 1)) continue;
    const sp = { d, dir, rn, h, ax, rh, fx, P, n0, n1 }; spines.push(sp); seg(n0.clone().addScaledVector(dir, d.r * 0.8), n1, rn + 0.4, 'nk'); seg(h, h, rh + 0.4); seg(bc, bc, rb + 0.4); seg(A0, A1, ra + 0.4);
    bgBout.push({ bc, dir: dir.clone().negate(), axb, rb, A0, A1, ra, P });
    const eBg = ellIn(bc, dir.clone().negate(), axb, rb, rb * 0.9), vv = [];
    for (let t = 0; t < 4000 && vv.length < 75; t++) { const p = bc.clone().add(V(rr(-rb, rb), rr(-rb, rb), rr(-rb, rb))); if (eBg(p) > 0.62) continue; if (p.clone().sub(P).dot(dir) > -1.6) continue;
      if (R() > Math.exp(-Math.max(0, p.distanceTo(P) - 3) / 5)) continue; if (segD(p, A0, A1) < ra + 1.2 && false) continue; if (vv.some((q) => q.distanceToSquared(p) < 4.4)) continue; vv.push(p); }
    vv.forEach((p) => bgVes.push({ p, s: 1 }));
    bgPsd.push({ p: P.clone().addScaledVector(dir, -0.95), s: V(0.55 * rh, 0.55 * rh, 1.3), n: dir });
  }
  // shafts with holes where spine necks join
  dens.slice(1).forEach((d) => { const nk = spines.filter((s) => s.d === d); addMesh(tubeGeo(d.pts, d.r, 420, 96, (p) => nk.reduce((m, s) => Math.min(m, segD(p, s.n0, s.n1) - s.rn), 9)), M.den2);
    for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2 + R(), r = d.r * rr(0.25, 0.7); addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(d.pts.map((p) => p.clone().add(d.axis === 'y' ? V(Math.cos(a) * r, 0, Math.sin(a) * r) : V(0, Math.cos(a) * r, Math.sin(a) * r)))), 300, 0.62, 8), M.mt); } });
  { const nk = spines.filter((s) => s.d.main); if (nk.length) { /* main shaft already built; its extra spine holes */ } }
  const spGeo = [], btGeo = [], axGeo = [];
  spines.forEach((s) => { const eh = ellIn(s.h, s.dir, s.ax, s.rh, s.rh * 0.95);
    spGeo.push(blobGeo({ c: s.h, dir: s.dir, ax: s.ax, ay: s.rh, az: s.rh * 0.95, fx: s.fx, nu: 44, nv: 88, kfn: (p) => segD(p, s.n0, s.n1) - s.rn }));
    spGeo.push(tubeGeo([s.n0, s.n0.clone().lerp(s.n1, 0.5), s.n1], s.rn, 30, 20, (p) => Math.min(eh(p) - 1, polyD(p, s.d.pts) - s.d.r))); });
  bgBout.forEach((o) => { const eo = ellIn(o.bc, o.dir, o.axb, o.rb, o.rb * 0.9);
    btGeo.push(blobGeo({ c: o.bc, dir: o.dir, ax: o.axb, ay: o.rb, az: o.rb * 0.9, fx: 0.7 * o.axb, noise: 0.5, mask: (pl) => ss(0.4 * o.axb, 0.1 * o.axb, pl.x), nu: 48, nv: 96, kfn: (p) => segD(p, o.A0, o.A1) - o.ra }));
    axGeo.push(tubeGeo([o.A0, o.A0.clone().lerp(o.A1, 0.5), o.A1], o.ra, 40, 18, (p) => eo(p) - 0.99)); });
  // main shaft's own extra spines need holes too: rebuild is costly, so they attach through small collars instead
  if (spGeo.length) addMesh(mergeGeometries(spGeo), M.den2);
  if (btGeo.length) addMesh(mergeGeometries([...btGeo, ...axGeo]), M.axon2);
  b.inst(new THREE.IcosahedronGeometry(1, 2), M.vesicle2, bgVes, 0.15);
  b.inst(new THREE.CylinderGeometry(1, 1, 1, 24).rotateX(Math.PI / 2), M.psd2, bgPsd, 0.1);
  // densely packed axon and astrocyte profiles running through the section (Poisson packing, ≥ 20 nm extracellular gaps)
  const vAx = [], vGl = [], vMT = [];
  for (let k = 0; k < 9000; k++) { const glia = k > 6200, x = rr(-BOX + 2, BOX - 2), y = rr(-BOX + 2, BOX - 2), r = glia ? rr(1.4, 3) : Math.min(5, 1.7 + Math.abs(gauss()) * 1.3);
    const t = R() * (glia ? 0.6 : 0.55), ph = R() * Math.PI * 2, dv = V(Math.sin(t) * Math.cos(ph), Math.sin(t) * Math.sin(ph), Math.cos(t)), c = V(x, y, -2);
    const A0 = c.clone().addScaledVector(dv, (ZB - 6 - c.z) / dv.z), A1 = c.clone().addScaledVector(dv, (4 - c.z) / dv.z); if (!clear(A0, A1, r, 1.0)) continue;
    seg(A0, A1, r); (glia ? vGl : vAx).push({ A0, A1, r, dv });
    if (!glia) { const k2 = r > 2.6 ? 3 : 2; for (let j = 0; j < k2; j++) { const a = j / k2 * Math.PI * 2 + R(), o = V(Math.cos(a), Math.sin(a), 0).multiplyScalar(r * 0.45); vMT.push(cylBetween(A0.clone().add(o), A1.clone().add(o), 0.62)); } } }
  const cylGeo = (o, flat) => { const L = o.A0.distanceTo(o.A1), g = new THREE.CylinderGeometry(o.r, o.r, L, flat ? 16 : 18, 6, true).rotateX(Math.PI / 2); if (flat) g.scale(1, 0.5, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, o.dv)); g.translate(...o.A0.clone().add(o.A1).multiplyScalar(0.5).toArray()); g.deleteAttribute('uv'); return g; };
  if (vAx.length) addMesh(mergeGeometries(vAx.map((o) => cylGeo(o))), M.axon2);
  if (vGl.length) addMesh(mergeGeometries(vGl.map((o) => cylGeo(o, true))), M.astro2);
  b.inst(GEO.cyl, M.mt, vMT, 0.1);

  // ======================= DYNAMIC ACTORS =======================
  const P = {
    glu: new Pool(scene, GEO.s0, M.glu, NG * 2 + 200), ca: new Pool(scene, GEO.s0, M.ca, 6000), na: new Pool(scene, GEO.s0, M.na, 9000),
    ampaC: new Pool(scene, ampaGeo, M.ampa, 80), ampaO: new Pool(scene, ampaGeo, M.ampaOpen, 80), vg: new Pool(scene, new THREE.CylinderGeometry(0.3, 0.36, 0.75, 10).rotateX(Math.PI / 2), M.vgcc, 50),
    vgO: new Pool(scene, new THREE.CylinderGeometry(0.3, 0.36, 0.75, 10).rotateX(Math.PI / 2), M.vgccOpen, 50), ring: new Pool(scene, new THREE.TorusGeometry(3.9, 0.6, 12, 64), M.ap, 8),
  };
  const mkClip = (geo, base) => { const m = base.clone(); m.clippingPlanes = [new THREE.Plane(V(1, 0, 0), 1e4)]; if (base.onBeforeCompile) { m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey; }
    const me = new THREE.Mesh(geo, m); me.frustumCulled = false; scene.add(me); return me; };
  const fusV = mkClip(vesGeo(4), M.vesicle), endV = mkClip(vesGeo(4), M.vesicle);
  // clathrin cage: dual of a geodesic sphere (12 pentagons + hexagons), struts as thin rods
  const cage = (() => { const g = new THREE.IcosahedronGeometry(1, 1), pa = g.attributes.position.array, faces = [], cen = [], key = (v) => v.map((x) => x.toFixed(4)).join(',');
    for (let f = 0; f < pa.length / 9; f++) { const vs = [0, 1, 2].map((k) => [pa[f * 9 + k * 3], pa[f * 9 + k * 3 + 1], pa[f * 9 + k * 3 + 2]]); faces.push(vs.map(key)); cen.push(V(...vs[0]).add(V(...vs[1])).add(V(...vs[2])).normalize()); }
    const edge = new Map(); faces.forEach((vs, f) => { for (let k = 0; k < 3; k++) { const e = [vs[k], vs[(k + 1) % 3]].sort().join('|'); (edge.get(e) || edge.set(e, []).get(e)).push(f); } });
    const items = []; for (const fs of edge.values()) if (fs.length === 2) items.push(cylBetween(cen[fs[0]], cen[fs[1]], 0.045)); cen.forEach((p) => items.push({ p, s: 0.07 }));
    const rod = new THREE.InstancedMesh(GEO.cyl, null, 1); void rod; return items; })();
  const coatMat = M.clathrin.clone(); coatMat.clippingPlanes = [new THREE.Plane(V(1, 0, 0), 1e4)];
  const coat = new THREE.Group(); scene.add(coat);
  { const rods = cage.filter((c) => c.s instanceof THREE.Vector3), nodes = cage.filter((c) => !(c.s instanceof THREE.Vector3));
    const mR = new THREE.InstancedMesh(GEO.cyl, coatMat, rods.length), mN = new THREE.InstancedMesh(GEO.s1, coatMat, nodes.length), Mx = new THREE.Matrix4(), q = new THREE.Quaternion();
    rods.forEach((it, i) => { q.setFromUnitVectors(UP, it.n); Mx.compose(it.p, q, it.s); mR.setMatrixAt(i, Mx); }); nodes.forEach((it, i) => { Mx.compose(it.p, new THREE.Quaternion(), V(it.s, it.s, it.s)); mN.setMatrixAt(i, Mx); });
    [mR, mN].forEach((m) => { m.frustumCulled = false; coat.add(m); }); }
  const dyn = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 10, 40), M.dyn); dyn.frustumCulled = false; scene.add(dyn);
  // membrane patches (fusion pore Ω and endocytic pit), continuous with the bouton membrane
  const mkPatch = () => { const g = new THREE.BufferGeometry(), PU = 20, PV = 64; g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PU + 1) * (PV + 1) * 3), 3));
    const idx = []; for (let i = 0; i < PU; i++) for (let j = 0; j < PV; j++) { const a = i * (PV + 1) + j, bq = a + 1, c = a + PV + 1, d = c + 1; idx.push(a, c, bq, bq, c, d); } g.setIndex(idx);
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PU + 1) * (PV + 1) * 3), 3)); const ix2 = idx.slice(); for (let i = 0; i < ix2.length; i += 3) { const t = ix2[i + 1]; ix2[i + 1] = ix2[i + 2]; ix2[i + 2] = t; } g2.setIndex(ix2);
    for (const gg of [g, g2]) { const m = new THREE.Mesh(gg, M.axon); m.frustumCulled = false; scene.add(m); } return { g, g2, PU, PV }; };
  const patF = mkPatch(), patE = mkPatch();
  const surfB = (q) => { // project onto the (flattened) bouton surface along the ray from its centre
    const d = q.clone().sub(Bc), s = 1 / Math.sqrt((d.x / BA[0]) ** 2 + (d.y / BA[1]) ** 2 + (d.z / BA[2]) ** 2), p = Bc.clone().addScaledVector(d, s); p.x = smin(p.x, -0.5, 2); return p; };
  function setPatch(pt, O, nOut, nIn, rv, hc, RP, onSurf) {
    const t1 = Math.abs(nOut.z) > 0.9 ? V(1, 0, 0) : V().crossVectors(nOut, UP).normalize(), t2 = V().crossVectors(nOut, t1);
    const rn = hc != null && Math.abs(hc) < rv ? Math.sqrt(rv * rv - hc * hc) : 0, pa = pt.g.attributes.position.array, pb = pt.g2.attributes.position.array;
    for (let i = 0; i <= pt.PU; i++) for (let j = 0; j <= pt.PV; j++) { const rho = rn + (RP - rn) * (i / pt.PU), a = j / pt.PV * Math.PI * 2;
      let base = O.clone().addScaledVector(t1, Math.cos(a) * rho).addScaledVector(t2, Math.sin(a) * rho); if (onSurf) base = onSurf(base);
      const lip = rn > 0 ? Math.min(0.4, rv * 0.42) * Math.max(0, 1 - (rho - rn) / 0.7) ** 2 * Math.min(1, rn / 0.18) : 0; base.addScaledVector(nIn, lip);
      const k = (i * (pt.PV + 1) + j) * 3; pa[k] = base.x; pa[k + 1] = base.y; pa[k + 2] = base.z; const in2 = base.addScaledVector(nIn, 0.25); pb[k] = in2.x; pb[k + 1] = in2.y; pb[k + 2] = in2.z; }
    for (const gg of [pt.g, pt.g2]) { gg.attributes.position.needsUpdate = true; gg.computeVertexNormals(); } return rn; }
  const setClip = (me, o, n, off = 0.004) => { const pl = me.material.clippingPlanes[0]; pl.normal.copy(n); pl.constant = -n.dot(o) + off; };
  const noClip = (me) => { const pl = me.material.clippingPlanes[0]; pl.normal.set(1, 0, 0); pl.constant = 1e4; };

  // ---------- per-molecule data ----------
  const gl = []; for (let i = 0; i < NG; i++) { const q = ballPts[i], u = clamp01((1 - (q.x + 1) / 2) * 0.75 + 0.25 * R());
    gl.push({ q, e: 0.12 + 1.05 * u, g: Math.max(0.4, Math.sqrt(-2 * Math.log(1 - R() * 0.985))), a: R() * Math.PI * 2, ph: R() * 6.28, w: rr(1.5, 3.5) }); }
  const caI = []; vgcc.forEach((c, ci) => { if (!c.open) return; for (let k = 0; k < 320; k++) caI.push({ ci, t: c.t * 0.45 + R() * 0.9, d: V(-Math.abs(gauss()) - 0.4, gauss(), gauss()).normalize(), s: rr(0.6, 1) }); });
  const naI = []; ampa.forEach((c, ai) => { if (!c.opens) return; for (let k = 0; k < 110; k++) naI.push({ ai, u: R(), d: V(Math.abs(gauss()) + 0.6, gauss() * 0.6, gauss() * 0.6).normalize(), s: rr(0.6, 1) }); });
  const S = 2.6, RCLEFT = 9.3, RUP = 19.2;
  const tauEff = (t, t0, T) => { const tau = Math.max(0, t - t0); return tau * (1 + 8 * ease(win(t, T.clear[0], T.clear[1])) + 40 * ease(win(t, T.clear[1], T.clear[1] + 3))); };
  const wedge = (r, a) => { const cb = Math.cos(a), sb = Math.sin(a), Rb = 1 / Math.hypot(cb / BA[1], sb / BA[2]), Rs = 1 / Math.hypot(cb / SA[1], sb / SA[2]);
    const lo = r >= Rb ? -9 : Math.min(-0.5, Bc.x + BA[0] * Math.sqrt(1 - (r / Rb) ** 2)), hi = r >= Rs ? 9 : Math.max(0.5, Sc.x - SA[0] * Math.sqrt(1 - (r / Rs) ** 2)); return [lo + 0.35, hi - 0.35]; };
  const fuseS = (t, T) => { const u = ease(win(t, T.fuse[0], T.fuse[1])); return { hc: 1 - 2 * u, on: t >= T.fuse[0] - 0.01 && u < 0.999 }; };
  const ampaWin = (c, T) => { const o = T.open0 + 0.9 * (c.d / 7) + 0.5 * c.r; return [o, o + 5.6 + 2.4 * c.r2]; };
  const gluPos = (m, i, t, T, out) => { // returns 0 not released, 1 in vesicle, 2 free (out set), 3 gone
    const tR = T.fuse[0] + m.e; const fs = fuseS(t, T);
    if (t < tR) { if (t < T.fuse[0]) return 0; const vc = V(-0.5 - Math.max(fs.hc, 0.05), F.y, F.z); out.copy(vc).addScaledVector(m.q, 0.7 * Math.max(0.3, Math.min(1, (fs.hc + 1) / 1.2))); if (out.x > -0.56) out.x = -0.56; return 1; }
    const te = tauEff(t, tR, T), r = m.g * S * Math.sqrt(te); if (r > RUP) return 3;
    let x; if (r < RCLEFT) x = 0.38 * Math.sin(m.ph + m.w * t); else { const [lo, hi] = wedge(r, m.a); x = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(m.ph + m.w * t * 0.5)); }
    x = -0.5 + (x + 0.5) * ease(Math.min(1, (t - tR) / 0.3)); out.set(x, F.y + Math.cos(m.a) * r, F.z + Math.sin(m.a) * r); return 2; };
  const bound = new Map(); ampa.forEach((c, ai) => { if (c.opens) { bound.set(ai * 2, ai); bound.set(ai * 2 + 1, ai); } });
  const ampaSite = (c, k) => V(0.5 - 0.42, c.y + (k ? 0.13 : -0.13), c.z);

  function census(t, T) {
    const tmp = V(); let gC = 0, up = 0; for (let i = 0; i < NG; i++) { const s = gluPos(gl[i], i, t, T, tmp); if (s === 2 && Math.hypot(tmp.y - F.y, tmp.z - F.z) < RCLEFT) gC++; if (s === 3) up++; }
    let caN = 0; for (const c of caI) if (t >= T.ca[0] + c.t) caN++;
    const open = ampa.filter((c) => { if (!c.opens) return false; const [o, cl] = ampaWin(c, T); return t >= o && t < cl; }).length;
    const docked = 10 - (t >= T.fuse[0] ? 1 : 0) + (t >= T.dock[1] ? 1 : 0), vesN = 200 - (t >= T.fuse[1] ? 1 : 0) + (t >= T.endo[1] ? 1 : 0);
    return { glu: gC, uptake: up, ca: caN, caMax: caI.length, ampa: open, ampaN: ampa.filter((c) => c.syn).length, docked, ves: vesN, vgOpen: t >= T.ca[0] && t < T.ca[1] ? vgcc.filter((c) => c.open).length : 0, vgN: vgcc.length };
  }

  // ======================= UPDATE =======================
  const tmp = V();
  function update(t, T) {
    const ms = Math.max(1, (globalThis.__camDist || 10) / 20);
    Object.values(P).forEach((p) => p.begin());
    // action potential: a depolarization ring running along the axon into the bouton, then the terminal membrane flashes
    if (t > T.ap[0] && t < T.ap[1] + 0.3) { const u = ease(win(t, T.ap[0], T.ap[1])), y = -120 + 98 * u, p = axC(y), tg = axC(y + 0.5).sub(p).normalize(); P.ring.add(p, 1, tg); for (let k = 1; k < 7; k++) { const yk = y - k * 2.6; if (yk < -120) break; const pk = axC(yk); P.ring.add(pk, 1 - k * 0.12, axC(yk + 0.5).sub(pk).normalize()); } }
    M.axon.emissiveIntensity = 0.55 * Math.max(0, Math.sin(Math.PI * win(t, T.flash[0], T.flash[1])));
    // Ca²⁺ channels: open during the window, ions rush in and spread a few tens of nm (nanodomain), then are buffered
    const caOn = t >= T.ca[0] && t < T.ca[1];
    vgcc.forEach((c) => { const p = V(-0.62, c.y, c.z); (caOn && c.open ? P.vgO : P.vg).add(p, 1, V(1, 0, 0)); });
    if (t > T.ca[0] && t < T.ca[1] + 1.6) for (const c of caI) { const t0 = T.ca[0] + c.t; if (t < t0) continue; const age = t - t0; const f = 1 - ease(win(age, 1.1, 1.7)); if (f <= 0.02) continue;
      const v = vgcc[c.ci]; P.ca.add(V(-0.95, v.y, v.z).addScaledVector(c.d, 3.0 * Math.sqrt(Math.min(1, age / 1.3)) * c.s), 0.05 * f * ms); }
    // fusion: the docked vesicle opens a pore, collapses fully into the membrane; glutamate floods the cleft
    const fs = fuseS(t, T), hc = fs.hc;
    fusV.visible = t < T.fuse[1]; fusV.scale.setScalar(1); fusV.position.set(-0.5 - (t < T.fuse[0] ? 1 : hc), F.y, F.z);
    if (t >= T.fuse[0]) setClip(fusV, V(-0.5, 0, 0), V(-1, 0, 0)); else noClip(fusV);
    setPatch(patF, F, V(1, 0, 0), V(-1, 0, 0), 1, t >= T.fuse[0] && t < T.fuse[1] ? hc : null, 2.55, null);
    for (let i = 0; i < NG; i++) { const m = gl[i], st = gluPos(m, i, t, T, tmp); if (st === 0 || st === 3) continue;
      if (st === 2 && bound.has(i)) { const c = ampa[bound.get(i)], [o, cl] = ampaWin(c, T), w = ease(win(t, o - 0.35, o)) * (1 - ease(win(t, cl, cl + 0.35))); if (w > 0) tmp.lerp(ampaSite(c, i & 1), w); }
      P.glu.add(tmp, 0.022 * ms); }
    if (t < T.fuse[0]) for (let i = 0; i < NG; i++) P.glu.add(V(-1.5, F.y, F.z).addScaledVector(gl[i].q, 0.7), 0.022);
    // AMPA receptors: open while glutamate is bound, Na⁺ flows into the spine
    let nOpen = 0;
    ampa.forEach((c, ai) => { const p = V(0.5, c.y, c.z); let open = false; if (c.opens) { const [o, cl] = ampaWin(c, T); open = t >= o && t < cl; }
      if (open) { nOpen++; P.ampaO.add(p, V(1.22, 1.22, 1.08), V(-1, 0, 0)); } else P.ampaC.add(p, 1, V(-1, 0, 0)); });
    for (const n of naI) { const c = ampa[n.ai], [o, cl] = ampaWin(c, T), t0 = o + n.u * (cl - o - 0.2); if (t < t0) continue; const age = t - t0, f = 1 - ease(win(age, 1.2, 1.9)); if (f <= 0.02) continue;
      P.na.add(V(0.75, c.y, c.z).addScaledVector(n.d, 5.5 * Math.sqrt(Math.min(1, age / 1.5)) * n.s), 0.055 * f * ms); }
    M.den.emissiveIntensity = 0.22 * clamp01(nOpen / 10);
    // endocytosis (clathrin-coated pit at the periactive zone) → uncoat → refill with glutamate; another vesicle re-docks at the release site
    const eu = ease(win(t, T.endo[0], T.endo[1])), h = -0.9 + 2.0 * eu, detached = t >= T.endo[1], rvE = 1.0;
    endV.visible = t >= T.endo[0]; let ec;
    if (!detached) { ec = E.clone().addScaledVector(nInE, h); setClip(endV, E, nInE); }
    else { ec = E.clone().addScaledVector(nInE, 1.1 + 3.6 * ease(win(t, T.endo[1], T.endo[1] + 1.6))); noClip(endV); }
    endV.position.copy(ec); endV.scale.setScalar(rvE);
    const rnE = setPatch(patE, E, nOutE, nInE, rvE, t >= T.endo[0] && !detached ? h : null, 3.35, surfB);
    coat.visible = t >= T.endo[0] && t < T.uncoat[1]; coat.position.copy(ec); coat.scale.setScalar(1.95); coatMat.opacity = 1 - ease(win(t, T.uncoat[0], T.uncoat[1]));
    if (!detached) setClip({ material: coatMat }, E, nInE, -0.32); else { coatMat.clippingPlanes[0].normal.set(1, 0, 0); coatMat.clippingPlanes[0].constant = 1e4; }
    dyn.visible = !detached && h > 0.55 && t >= T.endo[0]; if (dyn.visible) { dyn.position.copy(E).addScaledVector(nInE, 0.25); dyn.quaternion.setFromUnitVectors(UP, nOutE); dyn.scale.setScalar(Math.max(0.35, rnE + 0.3)); }
    if (detached) { const nF = Math.floor(NG * ease(win(t, T.refill[0], T.refill[1]))); for (let i = 0; i < nF; i++) P.glu.add(ec.clone().addScaledVector(ballPts[(i * 13) % NG], 0.7), 0.022); }
    { const du = ease(win(t, T.dock[0], T.dock[1])), p = ves[repIdx].clone().lerp(V(-1.5, F.y, F.z), du); const Mx = new THREE.Matrix4().compose(p, new THREE.Quaternion(), V(1, 1, 1)); vesMesh.setMatrixAt(repIdx, Mx); vesMesh.instanceMatrix.needsUpdate = true; }
    Object.values(P).forEach((p) => p.end());
  }

  // ======================= ANCHORS / PALETTE =======================
  const anchors = { tissue: V(10, -10, 0), syn: V(-6, 0, 0), bouton: V(-11, 0, 0), az: V(-0.8, 0, 0.8), cleft: V(0.2, 0, 0.8), spine: V(9, 0, 0), endo: E.clone(), astro: V(1, 19, 0),
    vesCut: ves.find((p, i) => i > 10 && Math.abs(p.z - 0.6) < 0.5 && p.x > -12) || V(-6, 2, 0), psd: V(1.6, 0, 0.8), clearView: V(0.5, 9, 0), apView: V(-18, -40, 0), recyc: V(-2.5, -8, 0), mito: V(-30, 0, 0), dendrite: V(60, 0, 0), neck: V(32, 1.2, -0.5) };
  anchors.ap = (t, T) => axC(-120 + 98 * ease(win(t, T.ap[0], T.ap[1])));
  anchors.endoVes = (t, T) => (t >= T.endo[1] ? E.clone().addScaledVector(nInE, 1.1 + 3.6 * ease(win(t, T.endo[1], T.endo[1] + 1.6))) : E.clone().addScaledVector(nInE, -0.9 + 2 * ease(win(t, T.endo[0], T.endo[1]))));
  const byKey = { axon: [M.axon], den: [M.den], astro: [M.astro], axon2: [M.axon2], den2: [M.den2], astro2: [M.astro2], mitoOut: [M.mitoOut], mitoIn: [M.mitoIn], sa: [M.sa], psd: [M.psd], psd2: [M.psd2],
    actin: [M.actin], mt: [M.mt], vesicle: [M.vesicle, fusV.material, endV.material], vesicle2: [M.vesicle2], dp: [M.dp], vgcc: [M.vgcc], ampa: [M.ampa], eaat: [M.eaat], adh: [M.adh], dyn: [M.dyn],
    glu: [M.glu], ca: [M.ca, M.vgccOpen], na: [M.na], ap: [M.ap], ampaOpen: [M.ampaOpen], clathrin: [coatMat] };
  function setPalette(pal) { const p = { ...PALETTE, ...(pal || {}) }; for (const [k, ms] of Object.entries(byKey)) if (p[k]) ms.forEach((m) => { m.color.set(p[k]); if (m.sheenColor) m.sheenColor.set(p[k]).lerp(new THREE.Color(0xffffff), 0.5); if (['glu', 'ca', 'na', 'ap', 'ampaOpen'].includes(k)) m.emissive.set(p[k]); }); }
  return { anchors, update, census, palette: PALETTE, setPalette, cohortSize: NG, stats: { vesicles: ves.length, docked: dock.length, ampa: ampa.length, vgcc: vgcc.length, spines: spines.length, axons: vAx.length, glia: vGl.length, fill: fill.length } };
}
