// Dashboard layout ("live tracking monitor"): 3D on the left; a dark instrument column on the right whose numbers
// come from the model itself (world.census: where each labeled molecule is at time t). No invented data:
// every count is a real count of the animated cohort, and the panel says so.
export const meta = { name: 'dashboard', camShift: (i, n, portrait) => (portrait ? [0, 0.15] : [0.15, 0]), portraitShift: true };
export const css = `
  .D-col { position:absolute; right:0; top:0; bottom:0; width:32%; background:linear-gradient(180deg, rgba(9,13,26,.96), rgba(6,9,18,.98)); border-left:1px solid rgba(120,160,255,.18);
    padding:calc(40*var(--u)) calc(40*var(--u)) calc(30*var(--u)); display:flex; flex-direction:column; gap:calc(18*var(--u)); font-family:"Noto Sans SC",sans-serif; }
  .D-h { font-size:calc(13*var(--u)); letter-spacing:calc(3*var(--u)); color:#7f8db3; }
  .D-title { font-family:"Noto Serif SC",serif; font-size:calc(30*var(--u)); font-weight:700; color:#f3f5fb; margin-top:calc(4*var(--u)); }
  .D-card { border:1px solid rgba(120,160,255,.16); border-radius:calc(12*var(--u)); padding:calc(16*var(--u)) calc(18*var(--u)); background:rgba(255,255,255,.025); }
  .D-card h5 { font-size:calc(13*var(--u)); font-weight:500; letter-spacing:calc(2*var(--u)); color:#9aa8cc; margin-bottom:calc(12*var(--u)); display:flex; justify-content:space-between; }
  .D-card h5 em { font-style:normal; color:#5f6c90; letter-spacing:0; }
  .D-row { display:grid; grid-template-columns:calc(118*var(--u)) 1fr calc(30*var(--u)); align-items:center; gap:calc(10*var(--u)); font-size:calc(15*var(--u)); color:#d5dbec; margin:calc(7*var(--u)) 0; }
  .D-row .bar { height:calc(10*var(--u)); border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; }
  .D-row .bar i { display:block; height:100%; background:#ffe27a; box-shadow:0 0 10px rgba(255,226,122,.7); border-radius:99px; }
  .D-row b { text-align:right; font-variant-numeric:tabular-nums; color:#ffe27a; }
  .D-row.zero { color:#5f6c90; } .D-row.zero b { color:#5f6c90; }
  .D-step b { display:block; font-family:"Noto Serif SC",serif; font-size:calc(24*var(--u)); color:#fff; margin-bottom:calc(6*var(--u)); }
  .D-step b small { font-family:"Noto Sans SC",sans-serif; font-size:calc(14*var(--u)); color:#ffe27a; margin-right:calc(10*var(--u)); letter-spacing:calc(2*var(--u)); }
  .D-step p { font-size:calc(16*var(--u)); line-height:1.7; color:#c3cbe0; }
  .D-legend { display:flex; flex-wrap:wrap; gap:calc(8*var(--u)) calc(16*var(--u)); font-size:calc(13.5*var(--u)); color:#c3cbe0; }
  .D-legend i { display:inline-block; width:calc(10*var(--u)); height:calc(10*var(--u)); border-radius:50%; margin-right:calc(6*var(--u)); }
  .D-tl { display:flex; gap:calc(8*var(--u)); } .D-tl div { flex:1; font-size:calc(12.5*var(--u)); color:#c3cbe0; border-left:2px solid #ffe27a; padding-left:calc(8*var(--u)); line-height:1.35; }
  .D-tl b { display:block; color:#ffe27a; font-size:calc(18*var(--u)); }
  .D-foot { margin-top:auto; font-size:calc(11.5*var(--u)); color:#5f6c90; line-height:1.6; }
  .D-track { position:absolute; left:calc(40*var(--u)); right:calc(32% + 40*var(--u)); bottom:calc(30*var(--u)); height:calc(26*var(--u)); }
  .D-track .ln { position:absolute; left:0; right:0; top:calc(12*var(--u)); height:2px; background:rgba(255,255,255,.18); }
  .D-track .fill { position:absolute; left:0; top:calc(12*var(--u)); height:2px; background:#ffe27a; }
  .D-track .tk { position:absolute; top:calc(7*var(--u)); width:calc(12*var(--u)); height:calc(12*var(--u)); margin-left:calc(-6*var(--u)); border-radius:50%; background:#0b1222; border:1.5px solid rgba(255,255,255,.45); }
  .D-track .tk.on { background:#ffe27a; border-color:#ffe27a; }
  body.portrait .D-col { left:0; width:auto; top:58%; border-left:0; border-top:1px solid rgba(120,160,255,.18); }
  body.portrait .D-track { right:calc(40*var(--u)); bottom:auto; top:calc(58% - 50*var(--u)); }
`;
const ROWS = [['notYet', '尚未合成'], ['er', '内质网腔'], ['toGolgi', '运输囊泡 → 高尔基'], ['golgi', '高尔基体'], ['toPM', '分泌囊泡 → 细胞膜'], ['outside', '已分泌到细胞外']];
export const html = `
  <div class="D-track"><div class="ln"></div><div class="fill"></div></div>
  <div class="D-col">
    <div><div class="D-h"></div><div class="D-title"></div></div>
    <div class="D-card"><h5>³H 标记蛋白 · 实时位置 <em class="D-n"></em></h5><div class="D-rows"></div></div>
    <div class="D-card D-step"><b></b><p></p></div>
    <div class="D-tl"></div>
    <div class="D-legend"></div>
    <div class="D-foot"></div>
  </div>
`;
const q = (s) => document.querySelector(s);
export function mount(ctx) {
  const { STORY, steps, DURATION, world } = ctx;
  q('.D-h').textContent = STORY.course; q('.D-title').textContent = STORY.title;
  q('.D-foot').innerHTML = `${STORY.footnote}<br>计数来自动画模型本身（${world.cohortSize || ''} 个示意分子），不是实验测量值<br>${STORY.sources}`;
  q('.D-n').textContent = `模型内计数 / ${world.cohortSize}`;
  q('.D-rows').innerHTML = ROWS.map(([k, n]) => `<div class="D-row" data-k="${k}"><span>${n}</span><div class="bar"><i></i></div><b>0</b></div>`).join('');
  const tr = q('.D-track'); steps.forEach((s) => { const d = document.createElement('div'); d.className = 'tk'; d.style.left = (s.t0 / DURATION * 100) + '%'; tr.appendChild(d); });
  ctx.ticks = [...tr.querySelectorAll('.tk')];
}
export function update(t, i, ctx) {
  const { STORY, steps, DURATION, PAL, world, ease, win, ticks } = ctx;
  const s = steps[i], lt = t - s.t0, a = ease(win(lt, 0.3, 1.0));
  if (world.census) { const c = world.census(t, STORY.T), n = world.cohortSize;
    for (const [k] of ROWS) { const row = q(`.D-row[data-k="${k}"]`); row.querySelector('i').style.width = (c[k] / n * 100) + '%'; row.querySelector('b').textContent = c[k]; row.classList.toggle('zero', !c[k]); } }
  q('.D-step b').innerHTML = `<small>${String(i + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}</small>${s.title}`;
  q('.D-step p').innerHTML = s.text.join(''); q('.D-step').style.opacity = 0.35 + 0.65 * a;
  q('.D-legend').innerHTML = (s.legend || []).map((k) => `<span><i style="background:${PAL[k]}"></i>${STORY.legend[k]}</span>`).join('');
  const RP = STORY.T.replay || [];
  q('.D-tl').innerHTML = (s.timeline || []).map(([tm, w], k) => `<div style="opacity:${ease(win(t, RP[k] - 0.4, RP[k] + 0.2))}"><b>${tm}</b>${w}</div>`).join('');
  q('.D-track .fill').style.width = (t / DURATION * 100) + '%'; ticks.forEach((d, k) => d.classList.toggle('on', k <= i));
}
