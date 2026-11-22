// English version of the secretory-pathway story (same science, same timing; only on-screen text changes)
import { STORY as ZH } from './story-secretion.js';
const EN = [
  ['A pancreatic acinus', ['Pyramidal acinar cells ring a central lumen and make digestive enzymes.', 'Nucleus and rough ER at the base, Golgi above the nucleus, zymogen granules at the apex.']],
  ['Synthesis starts on a free ribosome', ['A free ribosome begins the polypeptide from amino acids.', 'The first stretch made is the signal peptide (cyan).']],
  ['Moving to the rough ER', ['After a short stretch is made, the chain and its ribosome', 'move to the rough ER and keep translating there.']],
  ['Into the ER lumen', ['The chain crosses the ER membrane through a channel; the signal peptide is cleaved (ribosome shown translucent).', 'Inside the lumen the protein is processed and folded. The ribosome stays in the cytosol.']],
  ['ER → vesicle → Golgi', ['The ER membrane buds off a vesicle carrying the protein;', 'it reaches the cis face of the Golgi and fuses with it.']],
  ['Golgi: further processing', ['The Golgi modifies the protein further.', 'The label moves from the cis face (next to the ER) to the trans face.']],
  ['Vesicles from the Golgi', ['The Golgi membrane forms vesicles carrying the protein.', 'In acinar cells they merge into a condensing vacuole that matures into a zymogen granule.']],
  ['Granules head to the apex', ['Zymogen granules loaded with secretory protein', 'move to the apex and wait under the membrane.']],
  ['Fusion & secretion', ['On stimulation, the granule membrane fuses with the apical membrane and becomes part of it;', 'the protein is released into the acinar lumen.']],
  ['Energy mostly from mitochondria', ['All of this costs energy,', 'supplied mostly by mitochondria.']],
  ['Recap: the ³H-leucine experiment', ['Palade and colleagues tracked new protein with ³H-leucine;', 'radioactivity appeared, in order, in:']],
];
const SHORT = ['9 cells, one acinus', 'Ribosome starts', 'Docks on the ER', 'Into the ER lumen', 'Bud → Golgi', 'Golgi processing', 'Condensing vacuole', 'Off to the apex', 'Exocytosis!', 'Powered by mitochondria', '³H pulse-chase replay'];
export const STORY = {
  ...ZH, id: 'secretion-en',
  course: 'CELL BIOLOGY · SECRETORY PATHWAY · TEXTBOOK CHAPTER (PEP BIOLOGY 1, §3.2)',
  title: 'How a secretory protein leaves the cell',
  footnote: 'Animation · organelle shapes & proportions from EM data · cytosolic proteins shown only locally · time compressed · glow = ³H-labeled protein (schematic)',
  sources: 'Sources: PEP Biology 1 §3.2; Jamieson & Palade, J Cell Biol 1967; Palade, Science 1975',
  railNote: 'Energy: mostly from mitochondria',
  rail: ['Free ribosome', 'Rough ER', 'Vesicle', 'Golgi', 'Vesicle', 'Plasma membrane'],
  legend: { ribosome: 'Ribosome', er: 'Rough ER', golgi: 'Golgi', vesicle: 'Transport vesicle', vacuole: 'Condensing vacuole', granuleM: 'Zymogen granule', mitoOut: 'Mitochondrion',
    envelope: 'Nuclear envelope', pm: 'Plasma membrane', tracer: '³H-labeled protein', signal: 'Signal peptide', translocon: 'ER channel', mrna: 'mRNA', cargo: 'Unlabeled protein', lyso: 'Lysosome', mt: 'Microtubule', chromatin: 'Chromatin' },
  ui: { rows: { notYet: 'not made yet', er: 'ER lumen', toGolgi: 'vesicle → Golgi', golgi: 'Golgi', toPM: 'granule → membrane', outside: 'secreted' },
    live: '³H-labeled protein · live location', count: 'model count', countNote: 'counts come from the animation model itself, not from experimental data', pseudo: 'colours are pseudo-colours', textbook: 'textbook data' },
  steps: ZH.steps.map((s, i) => ({ ...s, title: EN[i][0], text: EN[i][1], reel: SHORT[i], reelSub: EN[i][1][0],
    ...(s.timeline ? { timeline: [['3 min', 'Rough ER (with ribosomes)'], ['17 min', 'Golgi'], ['117 min', 'Vesicles under the membrane · outside the cell']] } : {}) })),
};
