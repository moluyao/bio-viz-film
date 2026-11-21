// v2 engine: cinematic renderer (GTAO + depth of field + bloom), step timeline, optional lecture overlay.
//   ?story=secretion   which story-*.js to play (its scene is named inside the story)
//   ?layout=clean      pure 3D, no text at all; other values load layouts/<name>.js (default: story.layout || lecture)
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
import { LOOKS, PALETTES, CHANNEL_CYCLE } from './looks.js';

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
const LOOK = LOOKS[Q.get('look') || STORY.look || 'academic'];
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = LOOK.exposure;
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.8); renderer.clippingPlanes = [cutPlane]; renderer.localClippingEnabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
{ const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, LOOK.bg[0]); gr.addColorStop(0.55, LOOK.bg[1]); gr.addColorStop(1, LOOK.bg[2]); g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
scene.fog = new THREE.FogExp2(LOOK.fog, STORY.fog ?? 0.006);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(...LOOK.hemi));
const key = new THREE.DirectionalLight(0xfff1df, LOOK.key); key.position.set(-14, -20, 30); scene.add(key);
const rim = new THREE.DirectionalLight(0x7fb6ff, LOOK.rim); rim.position.set(18, 22, 4); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffc2d6, 0.5); fill.position.set(10, -30, 8); scene.add(fill);

globalThis.__bvOpts = { density: Number(Q.get('density') || STORY.density || 1) };
const world = SC.build(scene, Number(Q.get('seed') || 3));
const PAL0 = Q.get('palette') || STORY.palette || LOOK.palette;
if (world.setPalette) world.setPalette(PALETTES[PAL0], LOOK.glow);
if (LOOK.tracer && world.materials) { world.materials.tracer.color.set(LOOK.tracer); world.materials.tracer.emissive.set(LOOK.tracer); }
const FX = Q.get('fx') || STORY.fx || '';
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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), ...LOOK.bloom));
composer.addPass(new OutputPass());
// pseudo-colour channel switch: render the frame with the old and the new channel, wipe between them with a pixel band
const chanRT = new THREE.WebGLRenderTarget(W * DPR, H * DPR), chanQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, uW: { value: 0 }, uRes: { value: new THREE.Vector2(W * DPR, H * DPR) }, uT: { value: 0 }, uAcc: { value: new THREE.Color('#ffffff') } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tA, tB; uniform float uW, uT; uniform vec2 uRes; uniform vec3 uAcc;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){ vec2 px = vUv * uRes; float d = (vUv.x - uW) * uRes.x / uRes.y; float band = 1.0 - smoothstep(0.0, 0.09, abs(d));
      float bs = 14.0 * uRes.y / 1080.0; vec2 blk = floor(px / bs); float r = h(blk + floor(uT * 24.0)); vec2 uv = vUv; bool pix = r < band * 1.2; if (pix) uv = (blk + 0.5) * bs / uRes;
      vec4 c = vUv.x < uW ? texture2D(tB, uv) : texture2D(tA, uv); if (pix && r < band * 0.35) c.rgb = mix(c.rgb, uAcc, 0.65);
      c.rgb = mix(c.rgb, vec3(1.0), (1.0 - smoothstep(0.7, 2.2, abs(vUv.x - uW) * uRes.x)) * 0.9); gl_FragColor = c; }`, depthTest: false }));
const chanScene = new THREE.Scene(); chanScene.add(chanQuad); const chanCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const copyMat = new THREE.MeshBasicMaterial(); const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat); const copyScene = new THREE.Scene(); copyScene.add(copyQuad);
const chanOf = (i) => (i <= 0 ? PAL0 : CHANNEL_CYCLE[(CHANNEL_CYCLE.indexOf(PAL0) + i + 4) % CHANNEL_CYCLE.length] || CHANNEL_CYCLE[i % CHANNEL_CYCLE.length]);

// ---------- timeline ----------
const steps = STORY.steps; let acc = 0;
for (const s of steps) { s.t0 = acc; acc += s.dur; s.t1 = acc; }
const DURATION = acc;
const anchorAt = (name, t) => { const a = world.anchors[name]; return (typeof a === 'function' ? a(t, STORY.T) : a).clone(); };
const v3 = (a) => new THREE.Vector3(...a);
const PZ = H > W ? (STORY.portraitZoom ?? 1.7) : 1;
const camAt = (s, which, t) => { const tg = anchorAt(which === 'A' ? s.tA : s.tB, t), off = v3(which === 'A' ? s.offA : s.offB).multiplyScalar(H > W ? (s.pz ?? PZ) : 1); return { tg, off, pos: tg.clone().add(off) }; };
// camera blend: target linear, offset direction normalized-lerp, distance log-lerp (smooth zoom across scales)
const blendCam = (P, Q, k) => { const tg = P.tg.clone().lerp(Q.tg, k), lp = P.off.length(), lq = Q.off.length(), dir = P.off.clone().normalize().lerp(Q.off.clone().normalize(), k).normalize();
  const off = dir.multiplyScalar(Math.exp(Math.log(lp) + (Math.log(lq) - Math.log(lp)) * k)); return { tg, off, pos: tg.clone().add(off) }; };
const stepAt = (t) => { const i = steps.findIndex((s) => t < s.t1); return i < 0 ? steps.length - 1 : i; };

// ---------- layout (pluggable): ?layout=clean | lecture | notes | dashboard | <your own layouts/*.js> ----------
const $ = (id) => document.getElementById(id);
const PAL = world.palette;
const LAYOUT = Q.get('layout') || STORY.layout || 'lecture';
let LM = null; const ctx = { STORY, steps, DURATION, PAL, world, ease, win, clamp01, $ };
if (!CLEAN) { LM = await import(`./layouts/${LAYOUT}.js`); const st = document.createElement('style'); st.textContent = LM.css; document.head.appendChild(st);
  $('ov').innerHTML = LM.html; document.body.classList.add('L-' + LAYOUT); LM.mount(ctx); }

// ---------- frame ----------
function renderAt(t) {
  t = Math.min(Math.max(t, 0), DURATION - 1e-4);
  const i = stepAt(t), s = steps[i], lt = t - s.t0;
  const c = STORY.cut; cutPlane.constant = c.from + (c.to - c.from) * ease(win(t, c.t0, c.t1));
  world.update(t, STORY.T);
  let pos, tg;
  const A = camAt(s, 'A', t), B = camAt(s, 'B', t);
  const st = i > 0 ? s.t0 + STORY.move : s.t0, u = clamp01((t - st) / (s.t1 - st));
  let cc = blendCam(A, B, u);
  const mv = s.move ?? STORY.move;
  if (i > 0 && lt < mv) cc = blendCam(camAt(steps[i - 1], 'B', t), cc, ease(lt / mv));
  pos = cc.pos; tg = cc.tg;
  const dist = pos.distanceTo(tg); cam.near = Math.max(0.0008, dist * 0.015); cam.far = Math.max(60, dist * 60); cam.updateProjectionMatrix();
  cam.position.copy(pos); cam.lookAt(tg); cam.updateMatrixWorld();
  if (LM && LM.meta.camShift && (H <= W || LM.meta.portraitShift)) { const [dx, dy] = LM.meta.camShift(i, steps.length, H > W); cam.setViewOffset(W, H, W * dx, H * dy, W, H); } else cam.clearViewOffset();
  const fd = cam.position.distanceTo(anchorAt(s.focus || s.tB, t));
  bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = 0.006 / fd;
  const noFx = STORY.noFx || [], chI = FX === 'channels' ? i - noFx.filter((k) => k <= i).length : 0, wipe = FX === 'channels' && i > 0 && !noFx.includes(i) ? clamp01((lt - 0.3) / 1.1) : 1;
  if (FX === 'channels' && wipe > 0 && wipe < 1) {
    composer.renderToScreen = false;
    world.setPalette(PALETTES[chanOf(chI - 1)], LOOK.glow); composer.render();
    if (copyMat.map !== composer.readBuffer.texture) { copyMat.map = composer.readBuffer.texture; copyMat.needsUpdate = true; } renderer.setRenderTarget(chanRT); renderer.render(copyScene, chanCam);
    world.setPalette(PALETTES[chanOf(chI)], LOOK.glow); composer.render();
    chanQuad.material.uniforms.tA.value = chanRT.texture; chanQuad.material.uniforms.tB.value = composer.readBuffer.texture;
    chanQuad.material.uniforms.uW.value = -0.06 + 1.12 * ease(wipe); chanQuad.material.uniforms.uT.value = t;
    renderer.setRenderTarget(null); renderer.render(chanScene, chanCam); composer.renderToScreen = true;
  } else { if (FX === 'channels' && world.setPalette) world.setPalette(PALETTES[chanOf(chI)], LOOK.glow); composer.render(); }
  window.__channel = FX === 'channels' ? chanOf(chI) : PAL0; window.__palMap = PALETTES[window.__channel] || {};
  if (LM) LM.update(t, i, ctx);
}

window.DURATION = DURATION; window.renderAt = renderAt; window.__dbg = { scene, cam, THREE, W, H };
renderer.compile(scene, cam); renderAt(Number(Q.get('t') || 0)); window.__ready = true;
if (!Q.has('record') && !Q.has('t')) {
  const t0 = performance.now(); let paused = false, off = 0, pt = 0;
  addEventListener('keydown', (e) => { if (e.code === 'Space') { paused = !paused; if (!paused) off = (performance.now() - t0) / 1000 - pt; } });
  const loop = () => { if (!paused) { pt = ((performance.now() - t0) / 1000 - off) % DURATION; renderAt(pt); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
