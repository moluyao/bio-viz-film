// Lecture layout (dark academic): serif step titles with textbook wording, pathway rail, legend, sources.
export const meta = { name: 'lecture', camShift: (i, n) => { const k = i === 0 || i === n - 1 ? 0.35 : 1; return [-0.09 * k, 0.1 * k]; } };
export const css = `
  #scrim { position:absolute; left:0; bottom:0; width:70%; height:55%; background:radial-gradient(120% 100% at 0% 100%, rgba(4,7,16,.78) 0%, rgba(4,7,16,.45) 45%, rgba(4,7,16,0) 75%); }
  #scrimR { position:absolute; right:0; top:0; width:22%; height:100%; background:linear-gradient(270deg, rgba(4,7,16,.55), rgba(4,7,16,0)); }
  #course { position:absolute; left:calc(64*var(--u)); top:calc(52*var(--u)); font-size:calc(15*var(--u)); letter-spacing:calc(3*var(--u)); color:rgba(255,255,255,.72); display:flex; align-items:center; gap:calc(14*var(--u)); }
  #course::before { content:""; width:calc(34*var(--u)); height:calc(2*var(--u)); background:var(--tr); }
  #ttl { position:absolute; left:calc(64*var(--u)); top:calc(80*var(--u)); font-size:calc(34*var(--u)); font-weight:600; letter-spacing:calc(2*var(--u)); text-shadow:0 2px 18px rgba(0,0,0,.6); }
  #cap { position:absolute; left:calc(64*var(--u)); bottom:calc(96*var(--u)); width:calc(1000*var(--u)); }
  #cap .idx { font-size:calc(22*var(--u)); color:var(--tr); letter-spacing:calc(4*var(--u)); margin-bottom:calc(6*var(--u)); }
  #cap .idx b { font-weight:700; }
  #cap h2 { font-size:calc(44*var(--u)); font-weight:600; letter-spacing:calc(2*var(--u)); text-shadow:0 2px 24px rgba(0,0,0,.7); }
  #cap p { font-size:calc(24*var(--u)); line-height:1.6; color:rgba(235,242,255,.9); margin-top:calc(10*var(--u)); text-shadow:0 1px 12px rgba(0,0,0,.85); }
  #cap .bar { height:calc(2*var(--u)); background:linear-gradient(90deg,var(--tr),transparent); margin:calc(14*var(--u)) 0 calc(4*var(--u)); transform-origin:0 0; }
  #rail { position:absolute; right:calc(64*var(--u)); top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:calc(30*var(--u)); }
  #rail::before { content:""; position:absolute; right:calc(7*var(--u)); top:calc(8*var(--u)); bottom:calc(8*var(--u)); width:calc(1.5*var(--u)); background:rgba(255,255,255,.22); }
  .node { display:flex; align-items:center; justify-content:flex-end; gap:calc(14*var(--u)); font-size:calc(17*var(--u)); color:rgba(255,255,255,.42); position:relative; }
  .node i { width:calc(16*var(--u)); height:calc(16*var(--u)); border-radius:50%; border:calc(1.5*var(--u)) solid rgba(255,255,255,.5); background:#0b1222; z-index:1; }
  .node.done { color:rgba(255,255,255,.75); } .node.done i { background:rgba(255,255,255,.75); border-color:transparent; }
  .node.on { color:#fff; font-weight:600; } .node.on i { background:var(--tr); border-color:var(--tr); box-shadow:0 0 calc(14*var(--u)) var(--tr); }
  #energy { position:absolute; right:calc(64*var(--u)); top:calc(50% + 150*var(--u)); font-size:calc(14*var(--u)); color:rgba(255,255,255,.5); }
  #legend { position:absolute; right:calc(64*var(--u)); bottom:calc(96*var(--u)); display:flex; gap:calc(20*var(--u)); font-size:calc(15*var(--u)); color:rgba(255,255,255,.8); }
  #legend span { display:flex; align-items:center; gap:calc(8*var(--u)); transition:none; }
  #legend span i { width:calc(11*var(--u)); height:calc(11*var(--u)); border-radius:50%; }
  #tl { position:absolute; right:calc(64*var(--u)); bottom:calc(150*var(--u)); display:flex; gap:calc(16*var(--u)); }
  #tl div { width:calc(300*var(--u)); padding:calc(14*var(--u)) calc(16*var(--u)); border:1px solid rgba(255,226,122,.45); border-radius:calc(10*var(--u)); background:rgba(10,16,32,.55); backdrop-filter:blur(6px); }
  #tl b { display:block; font-size:calc(30*var(--u)); color:var(--tr); }
  #tl span { font-size:calc(16*var(--u)); color:rgba(255,255,255,.85); line-height:1.4; }
  #tl em { display:block; font-style:normal; font-size:calc(12*var(--u)); color:rgba(255,255,255,.5); margin-top:calc(6*var(--u)); }
  #foot { position:absolute; left:calc(64*var(--u)); right:calc(64*var(--u)); bottom:calc(40*var(--u)); display:flex; justify-content:space-between; font-size:calc(13*var(--u)); color:rgba(255,255,255,.5); letter-spacing:calc(.5*var(--u)); border-top:1px solid rgba(255,255,255,.14); padding-top:calc(12*var(--u)); }
  #prog { position:absolute; left:calc(64*var(--u)); bottom:calc(40*var(--u)); height:calc(2*var(--u)); background:var(--tr); opacity:.8; }
  /* portrait: caption full width at the bottom, rail becomes a top strip */
  body.portrait #cap { width:auto; right:calc(64*var(--u)); bottom:calc(150*var(--u)); }
  body.portrait #rail { top:calc(150*var(--u)); transform:none; }
  body.portrait #legend { left:calc(64*var(--u)); right:auto; bottom:calc(96*var(--u)); flex-wrap:wrap; }
  body.portrait #tl { left:calc(64*var(--u)); right:calc(64*var(--u)); bottom:calc(470*var(--u)); flex-direction:column; }
  body.portrait #tl div { width:auto; }
  body.portrait #foot { flex-direction:column; gap:calc(4*var(--u)); }
`;
export const html = `
  <div id="scrim"></div><div id="scrimR"></div>
  <div id="course"></div><div id="ttl" class="serif"></div>
  <div id="rail"></div><div id="energy"></div>
  <div id="tl"></div>
  <div id="cap"><div class="idx"></div><h2 class="serif"></h2><div class="bar"></div><p></p></div>
  <div id="legend"></div>
  <div id="prog"></div>
  <div id="foot"><span id="fn"></span><span id="src"></span></div>
`;
export function mount(ctx) {
  const { STORY, $ } = ctx;
  let nodes;
  $('course').textContent = STORY.course; $('ttl').textContent = STORY.title; $('fn').textContent = STORY.footnote; $('src').textContent = STORY.sources;
nodes = STORY.rail.map((n) => { const d = document.createElement('div'); d.className = 'node'; d.innerHTML = `<span>${n}</span><i></i>`; $('rail').appendChild(d); return d; });
$('energy').textContent = STORY.railNote || '';
  ctx.nodes = nodes;
}
export function update(t, i, ctx) {
  const { STORY, steps, DURATION, PAL, ease, win, $, nodes } = ctx;

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
