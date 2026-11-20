// v2 engine: cinematic renderer (GTAO + depth of field + bloom), step timeline, optional lecture overlay.
//   ?story=secretion   which story-*.js to play (its scene is named inside the story)
//   ?layout=clean      pure 3D, no text at all      (default: lecture)
//   ?record=1&dpr=2    used by the recorder; ?t=12.5 freezes on one time
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ease, clamp01, win } from './lib.js';

const Q = new URLSearchParams(location.search);
const { STORY } = await import(`./story-${Q.get('story') || 'secretion'}.js`);
const SC = await import(`./scene-${STORY.scene}.js`);
const W = innerWidth, H = innerHeight, DPR = Number(Q.get('dpr') || Math.min(2, devicePixelRatio));
const CLEAN = Q.get('layout') === 'clean';
document.body.classList.toggle('clean', CLEAN);
document.body.classList.toggle('portrait', H > W);
document.documentElement.style.setProperty('--u', (H > W ? W / 1080 : Math.min(W / 1920, H / 1080)) + 'px');

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(DPR); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.8); renderer.clippingPlanes = [cutPlane];
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
{ const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#16213d'); gr.addColorStop(0.55, '#0a1022'); gr.addColorStop(1, '#05070f'); g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
scene.fog = new THREE.FogExp2(0x0a1022, 0.006);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(0xa9bcff, 0x1a1c28, 0.7));
const key = new THREE.DirectionalLight(0xfff1df, 2.6); key.position.set(-14, -20, 30); scene.add(key);
const rim = new THREE.DirectionalLight(0x7fb6ff, 1.6); rim.position.set(18, 22, 4); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffc2d6, 0.5); fill.position.set(10, -30, 8); scene.add(fill);

const world = SC.build(scene, Number(Q.get('seed') || 3));
const cam = new THREE.PerspectiveCamera(30, W / H, 0.02, 400); cam.up.set(0, 0, 1);

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(W * DPR, H * DPR, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, cam));
const gtao = new GTAOPass(scene, cam, W, H);
gtao.updateGtaoMaterial({ radius: Number(Q.get('aor') || 0.25), distanceExponent: 1.4, thickness: Number(Q.get('aot') || 0.4), scale: 1.0, samples: 16 }); gtao.blendIntensity = 0.8; if (Q.has('aoout')) gtao.output = Number(Q.get('aoout'));
if (Q.has('gtao')) composer.addPass(gtao);
// transparent membranes must not enter the AO normal/depth pass (they would darken what is behind them)
const transparents = []; scene.traverse((o) => { if (o.isMesh && o.material.transparent) transparents.push(o); });
const ro = gtao.renderOverride.bind(gtao);
gtao.renderOverride = (...a) => { const vis = transparents.map((o) => o.visible); transparents.forEach((o) => { o.visible = false; }); ro(...a); transparents.forEach((o, k) => { o.visible = vis[k]; }); };
const bokeh = new BokehPass(scene, cam, { focus: 10, aperture: 0.001, maxblur: 0.005 });
if (!Q.has('nobokeh')) composer.addPass(bokeh);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.35, 0.95));
composer.addPass(new OutputPass());

// ---------- timeline ----------
const steps = STORY.steps; let acc = 0;
for (const s of steps) { s.t0 = acc; acc += s.dur; s.t1 = acc; }
const DURATION = acc;
const anchorAt = (name, t) => { const a = world.anchors[name]; return (typeof a === 'function' ? a(t, STORY.T) : a).clone(); };
const v3 = (a) => new THREE.Vector3(...a);
const camAt = (s, which, t) => { const tg = anchorAt(which === 'A' ? s.tA : s.tB, t); return { tg, pos: tg.clone().add(v3(which === 'A' ? s.offA : s.offB)) }; };
const stepAt = (t) => { const i = steps.findIndex((s) => t < s.t1); return i < 0 ? steps.length - 1 : i; };

// ---------- lecture overlay (built once, driven by t) ----------
const $ = (id) => document.getElementById(id);
const PAL = world.palette;
$('course').textContent = STORY.course; $('ttl').textContent = STORY.title; $('fn').textContent = STORY.footnote; $('src').textContent = STORY.sources;
const nodes = STORY.rail.map((n) => { const d = document.createElement('div'); d.className = 'node'; d.innerHTML = `<span>${n}</span><i></i>`; $('rail').appendChild(d); return d; });
$('energy').textContent = '能量：主要来自线粒体';
function overlay(t, i) {
  const s = steps[i], lt = t - s.t0, inU = ease(win(lt, 0.35, 1.1)), outU = ease(win(lt, s.dur - 0.7, s.dur - 0.1)), a = inU * (1 - outU);
  const cap = $('cap'); cap.style.opacity = a; cap.style.transform = `translateY(${(1 - inU) * 18}px)`;
  cap.querySelector('.idx').innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${String(steps.length).padStart(2, '0')}`;
  cap.querySelector('h2').textContent = s.title; cap.querySelector('p').innerHTML = s.text.join('<br>');
  cap.querySelector('.bar').style.transform = `scaleX(${ease(win(lt, 0.5, 1.6)) * 0.6})`;
  const railIdx = s.rail;
  nodes.forEach((n, k) => { n.className = 'node' + (railIdx === k ? ' on' : (railIdx > k || railIdx === -3) ? ' done' : ''); });
  $('rail').style.opacity = i === 0 ? ease(win(lt, 3, 4)) : 1;
  $('energy').style.color = s.rail === -2 ? '#ffe27a' : 'rgba(255,255,255,.5)';
  $('legend').innerHTML = (s.legend || []).map((k) => `<span><i style="background:${PAL[k]};${k === 'tracer' ? 'box-shadow:0 0 8px ' + PAL[k] : ''}"></i>${STORY.legend[k]}</span>`).join('');
  $('legend').style.opacity = a;
  const RP = STORY.T.replay || [0, 0, 0];
  $('tl').innerHTML = (s.timeline || []).map(([tm, where], k) => `<div style="opacity:${ease(win(t, RP[k] - 0.4, RP[k] + 0.2)) * (1 - outU)};border-color:${t > RP[k] - 0.1 && (k === 2 || t < RP[k + 1] - 0.1) ? '#ffe27a' : 'rgba(255,226,122,.3)'}"><b>${tm}</b><span>${where}</span><em>教材数据</em></div>`).join('');
  $('prog').style.width = `calc(${(t / DURATION) * 100}% - ${128 * (t / DURATION)}px)`;
}

// ---------- frame ----------
function renderAt(t) {
  t = Math.min(Math.max(t, 0), DURATION - 1e-4);
  const i = stepAt(t), s = steps[i], lt = t - s.t0;
  const c = STORY.cut; cutPlane.constant = c.from + (c.to - c.from) * ease(win(t, c.t0, c.t1));
  world.update(t, STORY.T);
  let pos, tg;
  const A = camAt(s, 'A', t), B = camAt(s, 'B', t);
  const st = i > 0 ? s.t0 + STORY.move : s.t0, u = clamp01((t - st) / (s.t1 - st));
  pos = A.pos.lerp(B.pos, u); tg = A.tg.lerp(B.tg, u);
  if (i > 0 && lt < STORY.move) { const P = camAt(steps[i - 1], 'B', t), k = ease(lt / STORY.move); pos = P.pos.lerp(pos, k); tg = P.tg.lerp(tg, k); }
  cam.position.copy(pos); cam.lookAt(tg); cam.updateMatrixWorld();
  if (!CLEAN && H <= W) { const k = i === 0 || i === steps.length - 1 ? 0.35 : 1; cam.setViewOffset(W, H, -W * 0.09 * k, H * 0.1 * k, W, H); } else cam.clearViewOffset();
  const fd = cam.position.distanceTo(anchorAt(s.focus || s.tB, t));
  bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = 0.006 / fd;
  composer.render();
  if (!CLEAN) overlay(t, i);
}

window.DURATION = DURATION; window.renderAt = renderAt; window.__dbg = { scene, cam, THREE, W, H };
renderer.compile(scene, cam); renderAt(Number(Q.get('t') || 0)); window.__ready = true;
if (!Q.has('record') && !Q.has('t')) {
  const t0 = performance.now(); let paused = false, off = 0, pt = 0;
  addEventListener('keydown', (e) => { if (e.code === 'Space') { paused = !paused; if (!paused) off = (performance.now() - t0) / 1000 - pt; } });
  const loop = () => { if (!paused) { pt = ((performance.now() - t0) / 1000 - off) % DURATION; renderAt(pt); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
