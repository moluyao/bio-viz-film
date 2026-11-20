// Notes layout (light "lecture handout"): 3D on the left in a rounded frame, a paper sidebar on the right
// listing every step (current one expanded with textbook wording), legend, experiment data, sources.
// Good for courseware / slides where students need the whole outline on screen.
export const meta = { name: 'notes', camShift: (i, n, portrait) => (portrait ? [0, 0.17] : [0.17, 0]), portraitShift: true };
export const css = `
  body.L-notes { background:#efe9dd; }
  body.L-notes #ov { pointer-events:none; }
  .N-frame { position:absolute; left:calc(28*var(--u)); top:calc(28*var(--u)); width:calc(64% - 40*var(--u)); bottom:calc(28*var(--u));
    border-radius:calc(18*var(--u)); box-shadow:0 0 0 calc(28*var(--u)) #efe9dd, 0 0 0 calc(29*var(--u)) rgba(60,50,30,.18); }
  .N-side { position:absolute; right:0; top:0; bottom:0; width:36%; background:#efe9dd; color:#2a2620; padding:calc(48*var(--u)) calc(52*var(--u)) calc(36*var(--u)) calc(24*var(--u)); display:flex; flex-direction:column; }
  .N-course { font-size:calc(14*var(--u)); letter-spacing:calc(2*var(--u)); color:#8a7d64; }
  .N-title { font-family:"Noto Serif SC",serif; font-size:calc(36*var(--u)); font-weight:700; margin:calc(8*var(--u)) 0 calc(22*var(--u)); color:#1d1a15; }
  .N-steps { list-style:none; flex:1; overflow:hidden; }
  .N-steps li { display:grid; grid-template-columns:calc(40*var(--u)) 1fr; padding:calc(7*var(--u)) 0; border-top:1px solid rgba(60,50,30,.12); font-size:calc(18*var(--u)); color:#b2a68f; }
  .N-steps li b { font-family:"Noto Serif SC",serif; font-weight:600; }
  .N-steps li.done { color:#6b604d; } .N-steps li.done span::after { content:"  ✓"; color:#3e8f6b; }
  .N-steps li.on { color:#1d1a15; } .N-steps li.on b { color:#b4561e; }
  .N-steps li .tx { grid-column:2; font-size:calc(16.5*var(--u)); line-height:1.65; color:#3d372d; overflow:hidden; }
  .N-legend { display:flex; flex-wrap:wrap; gap:calc(8*var(--u)) calc(18*var(--u)); font-size:calc(14*var(--u)); color:#4d4536; margin:calc(14*var(--u)) 0; }
  .N-legend i { display:inline-block; width:calc(11*var(--u)); height:calc(11*var(--u)); border-radius:50%; margin-right:calc(6*var(--u)); vertical-align:-1px; box-shadow:0 0 0 1px rgba(0,0,0,.15); }
  .N-tl { display:flex; gap:calc(10*var(--u)); margin-bottom:calc(12*var(--u)); }
  .N-tl div { flex:1; border:1px solid rgba(180,86,30,.35); border-radius:calc(8*var(--u)); padding:calc(8*var(--u)) calc(10*var(--u)); font-size:calc(13*var(--u)); line-height:1.35; background:rgba(255,255,255,.4); }
  .N-tl b { display:block; font-size:calc(22*var(--u)); color:#b4561e; font-family:"Noto Serif SC",serif; }
  .N-foot { font-size:calc(12*var(--u)); color:#8a7d64; line-height:1.6; border-top:1px solid rgba(60,50,30,.18); padding-top:calc(10*var(--u)); }
  .N-cap { position:absolute; left:calc(56*var(--u)); bottom:calc(52*var(--u)); font-family:"Noto Serif SC",serif; font-size:calc(26*var(--u)); color:#fff; text-shadow:0 2px 14px rgba(0,0,0,.8); }
  .N-cap small { display:block; font-family:"Noto Sans SC",sans-serif; font-size:calc(14*var(--u)); letter-spacing:calc(3*var(--u)); color:rgba(255,255,255,.7); margin-bottom:calc(4*var(--u)); }
  body.portrait .N-frame { left:calc(24*var(--u)); right:calc(24*var(--u)); width:auto; top:calc(24*var(--u)); bottom:auto; height:calc(56% - 36*var(--u)); }
  body.portrait .N-side { left:0; width:auto; top:56%; padding:calc(24*var(--u)) calc(48*var(--u)); }
  body.portrait .N-cap { bottom:auto; top:calc(56% - 110*var(--u)); }
`;
export const html = `
  <div class="N-frame"></div>
  <div class="N-cap"><small></small><span></span></div>
  <div class="N-side">
    <div class="N-course"></div><div class="N-title"></div>
    <ol class="N-steps"></ol>
    <div class="N-tl"></div>
    <div class="N-legend"></div>
    <div class="N-foot"></div>
  </div>
`;
const q = (s) => document.querySelector(s);
export function mount(ctx) {
  const { STORY, steps } = ctx;
  q('.N-course').textContent = STORY.course; q('.N-title').textContent = STORY.title;
  q('.N-foot').innerHTML = `${STORY.footnote}<br>${STORY.sources}`;
  q('.N-steps').innerHTML = steps.map((s, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${s.title}</span><div class="tx"></div></li>`).join('');
  ctx.items = [...document.querySelectorAll('.N-steps li')];
}
export function update(t, i, ctx) {
  const { STORY, steps, PAL, ease, win, items } = ctx;
  const s = steps[i], lt = t - s.t0, a = ease(win(lt, 0.3, 1.0));
  items.forEach((li, k) => { li.className = k === i ? 'on' : k < i ? 'done' : '';
    const tx = li.querySelector('.tx'); if (k === i) { tx.innerHTML = s.text.join(''); tx.style.maxHeight = `${a * 6}em`; tx.style.opacity = a; } else { tx.innerHTML = ''; tx.style.maxHeight = '0'; } });
  q('.N-cap small').textContent = `STEP ${String(i + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
  q('.N-cap span').textContent = s.title; q('.N-cap').style.opacity = a * (1 - ease(win(lt, s.dur - 0.6, s.dur - 0.1)));
  q('.N-legend').innerHTML = (s.legend || []).map((k) => `<span><i style="background:${PAL[k]}"></i>${STORY.legend[k]}</span>`).join('');
  const RP = STORY.T.replay || [];
  q('.N-tl').innerHTML = (s.timeline || []).map(([tm, w], k) => `<div style="opacity:${ease(win(t, RP[k] - 0.4, RP[k] + 0.2))}"><b>${tm}</b>${w}<br><span style="color:#8a7d64">教材数据</span></div>`).join('');
  q('.N-tl').style.display = s.timeline ? 'flex' : 'none';
}
