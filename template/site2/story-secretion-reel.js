// Showreel cut of the same science: ~37 s, vertical-friendly, bright look, pseudo-colour channel switches, one continuous camera.
import { STORY as BASE } from './story-secretion.js';
const K = 0.42, sc = (v) => (Array.isArray(v) ? v.map((x) => x * K) : v * K);
const SHORT = ['一圈 9 个细胞，围成一个腺泡', '核糖体开工', '对接内质网', '钻进内质网腔', '出芽 → 高尔基体', '高尔基体加工', '汇成浓缩泡', '奔向细胞顶端', '胞吐！', '能量来自线粒体', '³H 追踪回放'];
const SUB = ['腺泡细胞专门合成、分泌消化酶。', '游离核糖体开始合成多肽链，先合成信号肽。', '肽链连同核糖体一起转移到粗面内质网上。', '肽链穿过通道进入内质网腔，加工、折叠。', '内质网形成囊泡，把蛋白质送到高尔基体。',
  '高尔基体对蛋白质进一步修饰加工。', '囊泡汇成浓缩泡，浓缩成酶原颗粒。', '酶原颗粒移向细胞顶端。', '颗粒膜与细胞膜融合，蛋白质分泌到细胞外。', '这些过程所需的能量主要来自线粒体。', '³H 标记依次出现在内质网 → 高尔基体 → 细胞外。'];
export const STORY = {
  ...BASE, id: 'secretion-reel', layout: 'reel', look: 'vivid', fx: 'channels',
  cut: { ...BASE.cut, t0: 0.3, t1: 2.4 }, move: 1.5,
  T: { ...Object.fromEntries(Object.entries(BASE.T).map(([k, v]) => [k, sc(v)])), molScale: 2.2 },
  noFx: [8, 10],
  steps: BASE.steps.map((s, i) => ({ ...s, dur: s.dur * K, move: 1.5, reel: SHORT[i], reelSub: SUB[i], ...(i === 8 ? { offA: [-0.9, -0.35, 3.0], offB: [-0.6, -0.25, 2.3], pz: 1 } : {}) })),
};
