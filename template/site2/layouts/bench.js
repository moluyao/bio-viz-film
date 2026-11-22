// "Bench" layout: a light lab-instrument page around a framed live 3D section (portrait 1080×1350 or landscape).
// Every number on the page is real: scale bar / field from the camera, counts from world.census (model state),
// model time from story.clock, the AP trace uses textbook-typical values and says so.
export const meta = { name: 'bench', camShift: (i, n, portrait) => (portrait ? [0, 0.116] : [0.14, 0.02]), portraitShift: true };
export const css = `
  body.L-bench { background:#e9ecf4; }
  .B-mask { position:absolute; background:#e9ecf4; }
  .B { position:absolute; font-family:"Segoe UI",sans-serif; color:#11162a; }
  .B-card { background:#fff; border:calc(2*var(--u)) solid #11162a; border-radius:calc(16*var(--u)); }
  .B-top { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(20*var(--u)); height:calc(84*var(--u)); display:flex; align-items:stretch; }
  .B-top > div { padding:calc(12*var(--u)) calc(18*var(--u)); border-right:calc(2*var(--u)) solid #11162a; display:flex; flex-direction:column; justify-content:center; }
  .B-top > div:last-child { border-right:0; margin-left:auto; text-align:right; min-width:calc(150*var(--u)); }
  .B-logo { width:calc(46*var(--u)); height:calc(46*var(--u)); border-radius:50%; background:conic-gradient(#5b3df5,#ff4f8b,#ffd23a,#22c983,#5b3df5); position:relative; }
  .B-logo::after { content:''; position:absolute; inset:calc(11*var(--u)); border-radius:50%; background:#fff; border:calc(3*var(--u)) solid #11162a; }
  .B-brand { font-family:Bahnschrift,"Segoe UI",sans-serif; font-weight:700; font-size:calc(24*var(--u)); letter-spacing:calc(.3*var(--u)); white-space:nowrap; }
  .B-brand em { font-style:normal; color:#5b3df5; }
  .B-brand i { font-style:normal; background:#22c983; color:#fff; padding:0 calc(8*var(--u)); border-radius:calc(6*var(--u)); margin-left:calc(8*var(--u)); font-size:calc(19*var(--u)); vertical-align:middle; }
  .B-sm { font-family:Bahnschrift,"Segoe UI",sans-serif; font-size:calc(12.5*var(--u)); letter-spacing:calc(1.6*var(--u)); color:#6b7392; text-transform:uppercase; white-space:nowrap; }
  .B-val { font-family:Bahnschrift,"Segoe UI",sans-serif; font-size:calc(28*var(--u)); font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .B-val.g { color:#18a86f; } .B-val.v { color:#5b3df5; } .B-val.o { color:#ff6a00; }
  .B-tick { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(114*var(--u)); height:calc(36*var(--u)); border-radius:calc(18*var(--u)); background:#fff; border:calc(2*var(--u)) solid #11162a; overflow:hidden; display:flex; align-items:center; }
  .B-tick b { position:relative; z-index:2; flex:none; background:#11162a; color:#fff; font-family:Bahnschrift,sans-serif; font-size:calc(13*var(--u)); letter-spacing:calc(1.5*var(--u)); padding:0 calc(14*var(--u)); height:100%; display:flex; align-items:center; }
  .B-tick .trw { flex:1; height:100%; overflow:hidden; position:relative; display:flex; align-items:center; }
  .B-tick .tr { white-space:nowrap; font-size:calc(15*var(--u)); color:#2b3150; position:relative; }
  .B-tick .tr span::before { content:'◆'; color:#5b3df5; margin:0 calc(12*var(--u)) 0 calc(26*var(--u)); font-size:calc(11*var(--u)); }
  .B-vp { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(160*var(--u)); height:calc(728*var(--u)); border:calc(2*var(--u)) solid #11162a; border-radius:calc(16*var(--u)); pointer-events:none; }
  .B-vh { position:absolute; left:calc(18*var(--u)); top:calc(14*var(--u)); font-family:Bahnschrift,sans-serif; }
  .B-vh b { display:block; font-size:calc(26*var(--u)); font-weight:700; color:#11162a; text-shadow:0 0 calc(10*var(--u)) #fff, 0 0 calc(4*var(--u)) #fff; }
  .B-vh span { font-size:calc(14*var(--u)); color:#3a4160; letter-spacing:calc(1*var(--u)); text-shadow:0 0 calc(6*var(--u)) #fff; }
  .B-badge { position:absolute; right:calc(16*var(--u)); top:calc(14*var(--u)); background:#fff; border:calc(2*var(--u)) solid #11162a; border-radius:calc(10*var(--u)); padding:calc(4*var(--u)) calc(12*var(--u)); font-family:Bahnschrift,sans-serif; font-size:calc(14*var(--u)); letter-spacing:calc(1.5*var(--u)); }
  .B-badge::before { content:'●'; color:#ff4f8b; margin-right:calc(7*var(--u)); }
  .B-sb { position:absolute; left:calc(18*var(--u)); bottom:calc(16*var(--u)); font-family:Bahnschrift,sans-serif; font-size:calc(14*var(--u)); color:#11162a; background:rgba(255,255,255,.88); border:calc(2*var(--u)) solid #11162a; border-radius:calc(10*var(--u)); padding:calc(6*var(--u)) calc(10*var(--u)); }
  .B-sb i { display:block; height:calc(5*var(--u)); background:#11162a; margin-top:calc(4*var(--u)); border-radius:2px; }
  .B-prog { position:absolute; left:calc(270*var(--u)); right:calc(18*var(--u)); bottom:calc(24*var(--u)); height:calc(4*var(--u)); background:rgba(17,22,42,.15); border-radius:2px; }
  .B-prog i { display:block; height:100%; background:#5b3df5; border-radius:2px; }
  .B-call { position:absolute; background:#fff; border:calc(2*var(--u)) solid #11162a; border-radius:calc(12*var(--u)); padding:calc(10*var(--u)) calc(14*var(--u)); min-width:calc(210*var(--u)); box-shadow:calc(4*var(--u)) calc(4*var(--u)) 0 rgba(17,22,42,.9); }
  .B-call b { font-family:Bahnschrift,sans-serif; font-size:calc(19*var(--u)); display:block; } .B-call small { font-family:Bahnschrift,sans-serif; font-size:calc(12*var(--u)); letter-spacing:calc(1.5*var(--u)); color:#6b7392; text-transform:uppercase; }
  .B-call ul { list-style:none; margin-top:calc(6*var(--u)); font-size:calc(14.5*var(--u)); color:#2b3150; } .B-call li::before { content:'› '; color:#5b3df5; font-weight:700; }
  .B-ret { position:absolute; width:calc(52*var(--u)); height:calc(52*var(--u)); margin:calc(-26*var(--u)) 0 0 calc(-26*var(--u)); border:calc(2*var(--u)) solid #11162a; border-radius:50%; }
  .B-ret::before, .B-ret::after { content:''; position:absolute; background:#11162a; } .B-ret::before { left:50%; top:calc(-10*var(--u)); bottom:calc(-10*var(--u)); width:calc(2*var(--u)); margin-left:calc(-1*var(--u)); }
  .B-ret::after { top:50%; left:calc(-10*var(--u)); right:calc(-10*var(--u)); height:calc(2*var(--u)); margin-top:calc(-1*var(--u)); }
  .B-line { position:absolute; height:calc(2*var(--u)); background:#11162a; transform-origin:0 50%; }
  .B-strip { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(900*var(--u)); height:calc(86*var(--u)); display:grid; grid-template-columns:repeat(5,1fr); }
  .B-strip > div { padding:calc(10*var(--u)) calc(14*var(--u)); border-right:calc(2*var(--u)) solid #11162a; } .B-strip > div:last-child { border-right:0; }
  .B-strip .B-val { font-size:calc(25*var(--u)); } .B-strip .B-val small { font-size:calc(14*var(--u)); color:#8a91ad; font-weight:400; }
  .B-chips { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(998*var(--u)); height:calc(44*var(--u)); display:flex; align-items:center; padding:0 calc(8*var(--u)); gap:calc(4*var(--u)); }
  .B-chips span { flex:1; text-align:center; font-family:Bahnschrift,sans-serif; font-size:calc(13.5*var(--u)); color:#3a4160; padding:calc(5*var(--u)) 0; border-radius:calc(8*var(--u)); white-space:nowrap; }
  .B-chips span.on { background:#5b3df5; color:#fff; } .B-chips span.done { color:#9aa0bb; }
  .B-cards { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(1054*var(--u)); height:calc(244*var(--u)); display:grid; grid-template-columns:1fr 1fr 1fr; gap:calc(14*var(--u)); }
  .B-cards > div { padding:calc(12*var(--u)) calc(14*var(--u)); position:relative; overflow:hidden; }
  .B-ch { font-family:Bahnschrift,sans-serif; font-size:calc(15*var(--u)); font-weight:700; display:flex; justify-content:space-between; align-items:center; }
  .B-ch em { font-style:normal; font-weight:400; font-size:calc(11*var(--u)); letter-spacing:calc(1*var(--u)); border:calc(1.5*var(--u)) solid #11162a; border-radius:calc(6*var(--u)); padding:0 calc(6*var(--u)); }
  .B-cs { font-size:calc(12*var(--u)); color:#6b7392; margin:calc(2*var(--u)) 0 calc(6*var(--u)); }
  .B-cards svg { width:100%; height:calc(150*var(--u)); overflow:visible; }
  .B-conv { display:flex; flex-direction:column; gap:calc(9*var(--u)); margin-top:calc(8*var(--u)); }
  .B-conv div { border:calc(2*var(--u)) solid #c9cde0; border-radius:calc(10*var(--u)); padding:calc(7*var(--u)) calc(10*var(--u)); font-family:Bahnschrift,sans-serif; font-size:calc(15*var(--u)); color:#9aa0bb; display:flex; justify-content:space-between; }
  .B-conv div.on { border-color:#11162a; color:#11162a; background:#f3f0ff; } .B-conv div small { font-size:calc(12*var(--u)); }
  .B-step { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(800*var(--u)); }
  .B-foot { left:calc(24*var(--u)); right:calc(24*var(--u)); top:calc(1306*var(--u)); font-size:calc(9.6*var(--u)); color:#6b7392; line-height:1.45; }
  .B-txt { position:absolute; left:calc(18*var(--u)); bottom:calc(52*var(--u)); max-width:calc(640*var(--u)); background:rgba(255,255,255,.9); border:calc(2*var(--u)) solid #11162a; border-radius:calc(12*var(--u)); padding:calc(10*var(--u)) calc(14*var(--u)); font-size:calc(17*var(--u)); line-height:1.45; color:#1d2340; }
  .B-txt b { font-family:Bahnschrift,sans-serif; font-size:calc(13*var(--u)); color:#5b3df5; letter-spacing:calc(1.5*var(--u)); display:block; }
  .B-leg { position:absolute; right:calc(16*var(--u)); bottom:calc(52*var(--u)); background:rgba(255,255,255,.9); border:calc(2*var(--u)) solid #11162a; border-radius:calc(12*var(--u)); padding:calc(8*var(--u)) calc(12*var(--u)); font-size:calc(13.5*var(--u)); line-height:1.7; }
  .B-leg i { display:inline-block; width:calc(11*var(--u)); height:calc(11*var(--u)); border-radius:50%; margin-right:calc(7*var(--u)); vertical-align:middle; border:1px solid rgba(0,0,0,.25); }
`;
export const html = `
  <div class="B-mask m1"></div><div class="B-mask m2"></div><div class="B-mask m3"></div><div class="B-mask m4"></div>
  <div class="B B-card B-top"><div style="padding-right:calc(14*var(--u))"><div class="B-logo"></div></div>
    <div><div class="B-brand"></div><div class="B-sm B-sub"></div></div>
    <div><div class="B-sm">Field</div><div class="B-val g B-field"></div></div>
    <div><div class="B-sm">Step</div><div class="B-val B-stepn"></div></div>
    <div><div class="B-sm B-clockT">Model time</div><div class="B-val v B-clock"></div></div></div>
  <div class="B B-tick"><b>BENCH NOTES</b><div class="trw"><div class="tr"></div></div></div>
  <div class="B B-vp"><div class="B-vh"><b></b><span></span></div><div class="B-badge"></div><div class="B-txt"><b></b><span></span></div><div class="B-leg"></div>
    <div class="B-sb"><span></span><i></i></div><div class="B-prog"><i></i></div></div>
  <div class="B B-ret"></div><div class="B B-line"></div><div class="B B-call"><small></small><b></b><ul></ul></div>
  <div class="B B-card B-strip">
    <div><div class="B-sm">Vesicles · docked</div><div class="B-val r-ves"></div></div>
    <div><div class="B-sm">Ca²⁺ channels open</div><div class="B-val r-vg"></div></div>
    <div><div class="B-sm">Ca²⁺ in · total</div><div class="B-val r-ca"></div></div>
    <div><div class="B-sm">Glutamate in cleft</div><div class="B-val o r-glu"></div></div>
    <div><div class="B-sm">AMPA open</div><div class="B-val v r-ampa"></div></div></div>
  <div class="B B-card B-chips"></div>
  <div class="B B-cards">
    <div class="B-card"><div class="B-ch">Presynaptic voltage <em>TYPICAL</em></div><div class="B-cs">action potential, mV vs ms</div><svg class="sv-ap" viewBox="0 0 300 150"></svg></div>
    <div class="B-card"><div class="B-ch">Glutamate in cleft <em>MODEL</em></div><div class="B-cs">molecules, from the animation itself</div><svg class="sv-glu" viewBox="0 0 300 150"></svg></div>
    <div class="B-card"><div class="B-ch">Signal conversion <em>TEXTBOOK</em></div><div class="B-conv"><div>Electrical <small>presynaptic AP</small></div><div>Chemical <small>glutamate</small></div><div>Electrical <small>postsynaptic</small></div></div></div></div>
  <div class="B B-foot"></div>
`;
const q = (s) => document.querySelector(s);
const fmtN = (n) => n.toLocaleString('en-US');
function clockAt(S, t) { const seq = (a) => { if (!a || t < a[0][0] || t > a[a.length - 1][0] + 0.001) return null; for (let k = 0; k < a.length - 1; k++) if (t <= a[k + 1][0]) { const [t0, v0] = a[k], [t1, v1] = a[k + 1]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); } return a[a.length - 1][1]; };
  return seq(S.clock) ?? seq(S.clock2); }
const fmtClock = (ms) => (ms == null ? 'rest' : Math.abs(ms) < 0.1 ? `${(ms * 1000).toFixed(0)} µs` : ms < 1000 ? `${ms.toFixed(2)} ms` : `+${(ms / 1000).toFixed(0)} s`);
export function mount(ctx) {
  const { STORY: S, steps, W, H, world } = ctx, u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u'));
  // opaque masks around the 3D window
  const vp = { l: 24 * u, r: W - 24 * u, t: 160 * u, b: 888 * u }; ctx.vp = vp;
  const set = (el, l, t, w, h) => Object.assign(el.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
  set(q('.m1'), 0, 0, W, vp.t + 14 * u); set(q('.m2'), 0, vp.b - 14 * u, W, H - vp.b + 14 * u); set(q('.m3'), 0, 0, vp.l + 1, H); set(q('.m4'), vp.r - 1, 0, W - vp.r + 1, H);
  // rounded inner corners: draw the mask with a big inset shadow trick on the frame itself
  q('.B-vp').style.boxShadow = `0 0 0 ${16 * u}px #e9ecf4`;
  if (S.clockTitle) q('.B-clockT').textContent = S.clockTitle; q('.B-brand').innerHTML = `${S.brand} · <em>${S.title}</em><i>3D MODEL</i>`; q('.B-sub').textContent = S.sub;
  q('.B-tick .tr').innerHTML = [...S.notes, ...S.notes].map((n) => `<span>${n}</span>`).join('');
  q('.B-chips').innerHTML = steps.map((s, i) => `<span>${String(i + 1).padStart(2, '0')} ${s.chip}</span>`).join('');
  q('.B-foot').innerHTML = `${S.footnote}<br>${S.sources} · counts are from the animation model, not experimental data`;
  if (S.cards) { mountGeneric(ctx); return; }
  // AP trace (typical textbook values: rest −70 mV, peak ≈ +30 mV, ~1 ms)
  const X = (ms) => 30 + (ms + 0.5) / 2.5 * 260, Y = (mv) => 120 - (mv + 80) / 120 * 110;
  const ap = (ms) => { if (ms < 0) return -70 + 6 * Math.exp(ms * 6); if (ms < 0.35) return -64 + 94 * Math.sin(ms / 0.35 * Math.PI / 2); if (ms < 0.9) return 30 - 108 * ((ms - 0.35) / 0.55); return -78 + 8 * (1 - Math.exp(-(ms - 0.9) * 3)); };
  let d = ''; for (let ms = -0.5; ms <= 2.0; ms += 0.02) d += (d ? 'L' : 'M') + X(ms).toFixed(1) + ' ' + Y(ap(ms)).toFixed(1);
  q('.sv-ap').innerHTML = `<g font-family="Bahnschrift" font-size="11" fill="#6b7392"><text x="0" y="${Y(30) + 4}">+30</text><text x="0" y="${Y(-70) + 4}">−70</text><text x="${X(0) - 4}" y="146">0</text><text x="${X(1) - 4}" y="146">1</text><text x="${X(2) - 8}" y="146">2 ms</text></g>
    <line x1="30" x2="290" y1="${Y(-70)}" y2="${Y(-70)}" stroke="#c9cde0" stroke-dasharray="4 4"/><line x1="30" x2="290" y1="${Y(30)}" y2="${Y(30)}" stroke="#eef0f6"/>
    <path d="${d}" fill="none" stroke="#c9cde0" stroke-width="3"/><path class="ap-on" d="${d}" fill="none" stroke="#22c983" stroke-width="3.5"/><line class="ap-cur" y1="10" y2="132" stroke="#5b3df5" stroke-width="2"/><circle class="ap-dot" r="5" fill="#5b3df5"/>`;
  const apLen = q('.ap-on').getTotalLength(); q('.ap-on').style.strokeDasharray = apLen; ctx.ap = { X, Y, ap, apLen };
  // glutamate-in-cleft curve, precomputed from the model
  const T = S.T, t0 = T.fuse[0] - 0.5, t1 = T.clear[1] + 1, pts = []; for (let t = t0; t <= t1; t += 0.2) pts.push([t, world.census(t, T).glu]);
  const gx = (t) => 30 + (t - t0) / (t1 - t0) * 260, gy = (n) => 128 - n / 4000 * 112;
  const gd = pts.map(([t, n], k) => (k ? 'L' : 'M') + gx(t).toFixed(1) + ' ' + gy(n).toFixed(1)).join('');
  q('.sv-glu').innerHTML = `<g font-family="Bahnschrift" font-size="11" fill="#6b7392"><text x="0" y="${gy(4000) + 4}">4k</text><text x="0" y="${gy(2000) + 4}">2k</text><text x="0" y="${gy(0) + 4}">0</text><text x="30" y="146">release</text><text x="226" y="146">cleared</text></g>
    <line x1="30" x2="290" y1="${gy(0)}" y2="${gy(0)}" stroke="#c9cde0"/><line x1="30" x2="290" y1="${gy(2000)}" y2="${gy(2000)}" stroke="#eef0f6"/>
    <path d="${gd}L290 ${gy(0)}L30 ${gy(0)}Z" fill="#ff6a00" opacity=".06"/><path d="${gd}" fill="none" stroke="#c9cde0" stroke-width="3"/><path class="g-on" d="${gd}" fill="none" stroke="#ff6a00" stroke-width="3.5"/><circle class="g-dot" r="5" fill="#ff6a00"/>`;
  const gl = q('.g-on').getTotalLength(); q('.g-on').style.strokeDasharray = gl; ctx.gch = { gx, gy, t0, t1, gl };
}
export function update(t, i, ctx) {
  const { STORY: S, steps, DURATION, PAL, world, ease, win, cam, anchorAt, W, H, vp } = ctx, s = steps[i], lt = t - s.t0, a = ease(win(lt, 0.25, 0.9));
  // header readouts (field and scale bar measured at the focus plane)
  const fd = cam.position.distanceTo(anchorAt(s.focus || s.tB, t)), ppu = H / (2 * fd * Math.tan(cam.fov * Math.PI / 360)), nmpu = S.nmPerUnit || 20;
  const fieldUm = (vp.r - vp.l) / ppu * nmpu / 1000; q('.B-field').textContent = fieldUm >= 1 ? `${fieldUm.toFixed(1)} µm` : `${(fieldUm * 1000).toFixed(0)} nm`;
  const nice = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]; let bar = nice[0]; for (const n of nice) if (n / nmpu * ppu <= 200) bar = n;
  q('.B-sb span').textContent = bar >= 1000 ? `${bar / 1000} µm` : `${bar} nm`; q('.B-sb i').style.width = (bar / nmpu * ppu) + 'px';
  q('.B-stepn').textContent = `${String(i + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
  q('.B-clock').textContent = S.clockFn ? S.clockFn(t, i) : fmtClock(clockAt(S, t));
  q('.B-vh b').textContent = s.title; q('.B-vh span').textContent = `${S.tag || "SYN-01"} · ${s.chip.toUpperCase()}`; q('.B-badge').textContent = s.badge;
  q('.B-txt b').textContent = `STEP ${String(i + 1).padStart(2, '0')}`; q('.B-txt span').innerHTML = s.text.join(' '); q('.B-txt').style.opacity = a;
  q('.B-leg').innerHTML = (s.legend || []).map((k) => `<div><i style="background:${PAL[k]}"></i>${S.legend[k]}</div>`).join(''); q('.B-leg').style.opacity = a;
  q('.B-prog i').style.width = (t / DURATION * 100) + '%';
  q('.B-tick .tr').style.left = -((t * 70) % (q('.B-tick .tr').scrollWidth / 2)) + 'px';
  [...q('.B-chips').children].forEach((c, k) => { c.className = k === i ? 'on' : k < i ? 'done' : ''; });
  // callout with reticle on a live 3D anchor
  const c = s.call, ret = q('.B-ret'), line = q('.B-line'), box = q('.B-call'), ca = ease(win(lt, 0.6, 1.3)) * (1 - ease(win(t, s.t1 - 0.45, s.t1 - 0.05)));
  if (c) { const v = anchorAt(c.a, t).project(cam), x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, u = W / 1080;
    const inside = x > vp.l + 30 * u && x < vp.r - 30 * u && y > vp.t + 30 * u && y < vp.b - 30 * u && v.z < 1;
    const bw = box.offsetWidth || 240 * u, bh = box.offsetHeight || 110 * u; let bx = x + 70 * u, by = y - bh - 70 * u; if (bx + bw > vp.r - 16 * u) bx = x - 70 * u - bw; if (by < vp.t + 70 * u) by = y + 70 * u;
    Object.assign(ret.style, { left: x + 'px', top: y + 'px', opacity: inside ? ca : 0 }); Object.assign(box.style, { left: bx + 'px', top: by + 'px', opacity: inside ? ca : 0 });
    const ex = bx < x ? bx + bw : bx, ey = by < y ? by + bh : by, dx = ex - x, dy = ey - y, L = Math.hypot(dx, dy), k0 = 26 * u / L;
    Object.assign(line.style, { left: (x + dx * k0) + 'px', top: (y + dy * k0) + 'px', width: Math.max(0, L - 26 * u) + 'px', transform: `rotate(${Math.atan2(dy, dx)}rad)`, opacity: inside ? ca : 0 });
    box.querySelector('small').textContent = c.s; box.querySelector('b').textContent = c.t; box.querySelector('ul').innerHTML = c.b.map((x2) => `<li>${x2}</li>`).join(''); }
  // model readouts
  const k = world.census(t, S.T);
  if (S.cards) { updateGeneric(t, i, ctx, k); return; }
  q('.r-ves').innerHTML = `${k.ves} <small>· ${k.docked}</small>`; q('.r-vg').innerHTML = `${k.vgOpen} <small>/ ${k.vgN}</small>`; q('.r-ca').innerHTML = `${fmtN(k.ca)}`;
  q('.r-glu').innerHTML = `${fmtN(k.glu)} <small>/ 4,000</small>`; q('.r-ampa').innerHTML = `${k.ampa} <small>/ ${k.ampaN}</small>`;
  // AP trace cursor follows the model clock
  const ms = clockAt(S, t), A = ctx.ap; const cm = ms == null ? (t < S.T.ap[0] ? -0.5 : 2.0) : Math.max(-0.5, Math.min(2.0, ms));
  const frac = (A.X(cm) - 30) / 260; q('.ap-on').style.strokeDashoffset = A.apLen * (1 - frac);
  q('.ap-cur').setAttribute('x1', A.X(cm)); q('.ap-cur').setAttribute('x2', A.X(cm)); q('.ap-dot').setAttribute('cx', A.X(cm)); q('.ap-dot').setAttribute('cy', A.Y(A.ap(cm)));
  const G = ctx.gch, gt = Math.max(G.t0, Math.min(G.t1, t)); q('.g-on').style.strokeDashoffset = G.gl * (1 - (gt - G.t0) / (G.t1 - G.t0)); q('.g-dot').setAttribute('cx', G.gx(gt)); q('.g-dot').setAttribute('cy', G.gy(k.glu));
  const cv = S.conv[i]; [...q('.B-conv').children].forEach((d, j) => d.classList.toggle('on', cv === 3 || cv === j));
}

// ---------- generic strip + cards (story.strip / story.cards), used by topics other than the synapse ----------
// strip: [{l: label, f: (census) => html}]   cards: [{type:'bars'|'dial'|'flow', title, tag, sub, ...}]
function mountGeneric(ctx) {
  const S = ctx.STORY, st = q('.B-strip'); st.style.gridTemplateColumns = `repeat(${S.strip.length},1fr)`;
  st.innerHTML = S.strip.map((c, j) => `<div><div class="B-sm">${c.l}</div><div class="B-val ${c.cls || ''} gs${j}"></div></div>`).join('');
  q('.B-cards').innerHTML = S.cards.map((c, j) => `<div class="B-card"><div class="B-ch">${c.title} <em>${c.tag}</em></div><div class="B-cs">${c.sub || ''}</div><div class="gc${j}"></div></div>`).join('');
  S.cards.forEach((c, j) => { const el = q('.gc' + j);
    if (c.type === 'bars') el.innerHTML = c.items.map((it, n) => `<div style="display:flex;align-items:center;gap:calc(8*var(--u));margin:calc(9*var(--u)) 0;font-family:Bahnschrift;font-size:calc(14*var(--u))"><span style="width:calc(70*var(--u))">${it.l}</span><div style="flex:1;height:calc(16*var(--u));background:#eef0f6;border-radius:99px;overflow:hidden"><i class="gb${j}_${n}" style="display:block;height:100%;width:0;background:${it.c};border-radius:99px"></i></div><b class="gv${j}_${n}" style="width:calc(62*var(--u));text-align:right">—</b></div>`).join('') + (c.note ? `<div class="B-cs" style="margin-top:calc(4*var(--u))">${c.note}</div>` : '');
    if (c.type === 'dial') el.innerHTML = `<svg viewBox="0 0 300 150"><g class="dl${j}" transform="translate(80 75)">${Array.from({ length: c.n }, (_, m) => { const a = m / c.n * Math.PI * 2; return `<circle cx="${(Math.cos(a) * 46).toFixed(1)}" cy="${(Math.sin(a) * 46).toFixed(1)}" r="9" fill="${m === 0 ? '#ff4fa0' : '#d9cfff'}" stroke="#11162a" stroke-width="1.5"/>`; }).join('')}<line x1="0" y1="0" x2="30" y2="0" stroke="#11162a" stroke-width="4" stroke-linecap="round"/></g><circle cx="80" cy="75" r="7" fill="#11162a"/>
      <g font-family="Bahnschrift" fill="#11162a"><text x="160" y="52" font-size="13" fill="#6b7392">${c.l1}</text><text class="dv${j}a" x="160" y="76" font-size="24"></text><text x="160" y="104" font-size="13" fill="#6b7392">${c.l2}</text><text class="dv${j}b" x="160" y="128" font-size="24" fill="#ff7a00"></text></g></svg>`;
    if (c.type === 'flow') el.innerHTML = `<div class="B-conv">${c.items.map((it) => `<div>${it[0]} <small>${it[1]}</small></div>`).join('')}</div>`; });
}
function updateGeneric(t, i, ctx, k) {
  const S = ctx.STORY; S.strip.forEach((c, j) => { q('.gs' + j).innerHTML = c.f(k); });
  S.cards.forEach((c, j) => {
    if (c.type === 'bars') c.items.forEach((it, n) => { const v = it.v(k, t, i); q(`.gb${j}_${n}`).style.width = (v == null ? 0 : Math.max(0, Math.min(1, (v - (it.min || 0)) / (it.max - (it.min || 0)))) * 100) + '%'; q(`.gv${j}_${n}`).textContent = v == null ? '—' : it.fmt ? it.fmt(v) : v; });
    if (c.type === 'dial') { q('.dl' + j).setAttribute('transform', `translate(80 75) rotate(${(-Number(k.turns) * 360).toFixed(2)})`); q(`.dv${j}a`).textContent = c.va(k); q(`.dv${j}b`).textContent = c.vb(k); }
    if (c.type === 'flow') { const on = S.flowOn[i] || []; [...q('.gc' + j + ' .B-conv').children].forEach((d, m) => d.classList.toggle('on', on.includes(m))); } });
}
