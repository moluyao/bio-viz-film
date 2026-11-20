// Reel layout ("炫片"): bold one-line hook per step, pseudo-colour channel chip, minimal honest footnote. Built for vertical feeds.
export const meta = { name: 'reel', camShift: (i, n, portrait) => (portrait ? [0, -0.04] : [0, 0]), portraitShift: true };
export const css = `
  .R-top { position:absolute; left:calc(70*var(--u)); right:calc(70*var(--u)); top:calc(110*var(--u)); }
  .R-k { display:inline-block; font-size:calc(22*var(--u)); letter-spacing:calc(4*var(--u)); font-weight:700; color:#fff; background:linear-gradient(90deg,#ff4f8b,#ffb02e); padding:calc(6*var(--u)) calc(14*var(--u)); border-radius:calc(30*var(--u)); }
  .R-t { margin-top:calc(18*var(--u)); font-family:"Noto Sans SC",sans-serif; font-weight:900; font-size:calc(86*var(--u)); line-height:1.08; color:#fff;
    -webkit-text-stroke:calc(3*var(--u)) rgba(30,10,60,.85); paint-order:stroke fill; text-shadow:0 calc(6*var(--u)) calc(28*var(--u)) rgba(40,0,80,.45); }
  .R-s { margin-top:calc(14*var(--u)); font-size:calc(30*var(--u)); font-weight:600; color:#1d1430; background:rgba(255,255,255,.82); display:inline-block; padding:calc(6*var(--u)) calc(14*var(--u)); border-radius:calc(10*var(--u)); }
  .R-ch { position:absolute; right:calc(70*var(--u)); bottom:calc(210*var(--u)); font-size:calc(20*var(--u)); color:#fff; background:rgba(20,10,40,.55); padding:calc(6*var(--u)) calc(14*var(--u)); border-radius:calc(20*var(--u)); letter-spacing:calc(2*var(--u)); }
  .R-ch i { display:inline-block; width:calc(12*var(--u)); height:calc(12*var(--u)); border-radius:50%; margin-right:calc(8*var(--u)); background:linear-gradient(90deg,#ff4f8b,#38d6ff); }
  .R-lg { position:absolute; left:calc(70*var(--u)); bottom:calc(210*var(--u)); display:flex; flex-direction:column; gap:calc(6*var(--u)); font-size:calc(20*var(--u)); font-weight:600; color:#1d1430; }
  .R-lg span { background:rgba(255,255,255,.78); padding:calc(3*var(--u)) calc(10*var(--u)); border-radius:calc(8*var(--u)); }
  .R-lg i { display:inline-block; width:calc(14*var(--u)); height:calc(14*var(--u)); border-radius:50%; margin-right:calc(8*var(--u)); vertical-align:-1px; }
  .R-f { position:absolute; left:calc(70*var(--u)); right:calc(70*var(--u)); bottom:calc(120*var(--u)); font-size:calc(18*var(--u)); color:rgba(30,20,50,.75); line-height:1.5; }
  .R-bar { position:absolute; left:calc(70*var(--u)); right:calc(70*var(--u)); bottom:calc(90*var(--u)); height:calc(6*var(--u)); border-radius:9px; background:rgba(255,255,255,.4); overflow:hidden; }
  .R-bar i { display:block; height:100%; background:linear-gradient(90deg,#ff4f8b,#ffb02e,#38d6ff); }
  body.L-reel.dark .R-f { color:rgba(255,255,255,.7); }
  body:not(.portrait) .R-t { font-size:calc(64*var(--u)); } body:not(.portrait) .R-top { top:calc(60*var(--u)); right:auto; max-width:60%; }
`;
export const html = `<div class="R-top"><span class="R-k"></span><div class="R-t"></div><div class="R-s"></div></div><div class="R-ch"><i></i><span></span></div><div class="R-lg"></div><div class="R-f"></div><div class="R-bar"><i></i></div>`;
const q = (s) => document.querySelector(s);
const CN = { textbook: '教学配色', candy: '糖果', ice: '冰蓝', sunset: '日落', neon: '霓虹' };
export function mount(ctx) { q('.R-f').textContent = '示意动画 · 细胞器形态和比例依据电镜资料 · 颜色为伪彩 · 时间已压缩 · ' + ctx.STORY.sources.replace('依据：', ''); }
export function update(t, i, ctx) {
  const { steps, DURATION, ease, win } = ctx, s = steps[i], lt = t - s.t0, a = ease(win(lt, 0.15, 0.6)) * (1 - ease(win(lt, s.dur - 0.35, s.dur - 0.05)));
  q('.R-k').textContent = `${String(i + 1).padStart(2, '0')} / ${steps.length}`; q('.R-t').textContent = s.reel || s.title; q('.R-s').textContent = s.reelSub || s.text[0];
  const P = ctx.world.palette, pal = window.__palMap || {}; q('.R-lg').innerHTML = (s.legend || []).slice(0, 5).map((k) => `<span><i style="background:${pal[k] || P[k]}"></i>${ctx.STORY.legend[k]}</span>`).join('');
  const top = q('.R-top'); top.style.opacity = a; top.style.transform = `translateY(${(1 - ease(win(lt, 0.1, 0.6))) * 30}px) scale(${0.96 + 0.04 * ease(win(lt, 0.1, 0.6))})`;
  q('.R-ch span').textContent = `伪彩配色 · ${CN[window.__channel] || window.__channel || ''}（非显微成像）`;
  q('.R-bar i').style.width = (t / DURATION * 100) + '%';
}
