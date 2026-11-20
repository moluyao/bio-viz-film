// Shared helpers for v2 scenes: seeded random, even sphere points, instanced builder, materials.
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const UP = V(0, 0, 1);
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function fib(n) {
  const out = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), th = g * i; out.push(V(Math.cos(th) * r, y, Math.sin(th) * r)); }
  return out;
}
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ease = (u) => { u = clamp01(u); return u * u * u * (u * (6 * u - 15) + 10); };
export const win = (t, t0, t1) => clamp01((t - t0) / (t1 - t0)); // 0→1 progress inside [t0,t1]

export const GEO = {
  s0: new THREE.IcosahedronGeometry(1, 0), s1: new THREE.IcosahedronGeometry(1, 1),
  s2: new THREE.IcosahedronGeometry(1, 2), s3: new THREE.IcosahedronGeometry(1, 3),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2),
};

export class Builder {
  constructor(scene, seed) { this.scene = scene; this.R = rng(seed); this.count = 0; this.mats = {}; }
  rr(a, b) { return a + (b - a) * this.R(); }
  mat(color, o = {}) {
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4,
      sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5), side: THREE.DoubleSide, ...o });
  }
  // items: {p, s:number|Vector3, n?:Vector3 (z-axis direction), q?:Quaternion}
  inst(geo, material, items, jit = 0.16) {
    const m = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
    m.count = items.length;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), col = new THREE.Color();
    items.forEach((it, i) => {
      if (it.q) q.copy(it.q); else if (it.n) q.setFromUnitVectors(UP, it.n); else q.identity();
      if (typeof it.s === 'number') s.setScalar(it.s); else s.copy(it.s);
      M.compose(it.p, q, s); m.setMatrixAt(i, M);
      const j = 1 - jit / 2 + this.R() * jit; m.setColorAt(i, col.setRGB(j, j, j));
    });
    m.frustumCulled = false; this.scene.add(m); this.count += items.length;
    (this.statics ||= []).push({ m, items }); return m;
  }
  // Baked ambient occlusion: darken each bead by how crowded its neighbourhood is (only geometry below the cut counts).
  bakeAO({ cell = 0.55, radius = 0.55, cutZ = 0.8, strength = 0.6, k0 = 4, k1 = 26 } = {}) {
    const grid = new Map(), key = (x, y, z) => `${x},${y},${z}`, all = [];
    for (const { items } of this.statics) for (const it of items) { if (it.p.z > cutZ + 0.2) continue; all.push(it.p); }
    for (const p of all) { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(p); }
    const r2 = radius * radius, col = new THREE.Color();
    for (const { m, items } of this.statics) {
      items.forEach((it, i) => { const p = it.p, cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell); let n = 0;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const a = grid.get(key(cx + dx, cy + dy, cz + dz)); if (a) for (const q of a) { if (q.distanceToSquared(p) < r2) n++; } }
        const occ = Math.min(1, Math.max(0, (n - k0) / k1)); m.getColorAt(i, col); col.multiplyScalar(1 - strength * occ); m.setColorAt(i, col); });
      m.instanceColor.needsUpdate = true;
    }
  }
  mesh(geo, material) { const m = new THREE.Mesh(geo, material); m.frustumCulled = false; this.scene.add(m); this.count++; return m; }
  tube(pts, r, material, seg) { return this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || pts.length * 10, r, 8, false), material); }
}

// A dynamic instanced pool whose matrices are rewritten every frame (for moving cargo, vesicles...)
export class Pool {
  constructor(scene, geo, material, max) {
    this.m = new THREE.InstancedMesh(geo, material, max); this.m.frustumCulled = false; this.m.count = 0; scene.add(this.m);
    this.M = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = V(); this.n = 0;
  }
  begin() { this.n = 0; }
  add(p, s, n) { if (this.n >= this.m.instanceMatrix.count) return; if (n) this.q.setFromUnitVectors(UP, n); else this.q.identity();
    if (typeof s === 'number') this.s.setScalar(s); else this.s.copy(s); this.M.compose(p, this.q, this.s); this.m.setMatrixAt(this.n++, this.M); }
  end() { this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true; }
}
