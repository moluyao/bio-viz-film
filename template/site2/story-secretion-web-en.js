// English web-page cut for X/Twitter: showreel timing + the live-tracking dashboard page, bright look, pseudo-colour channel wipes
import { STORY as EN } from './story-secretion-en.js';
import { STORY as REEL } from './story-secretion-reel.js';
export const STORY = {
  ...EN, id: 'secretion-web-en', layout: 'dashboard', look: 'vivid', fx: 'channels', density: 2.5, noFx: REEL.noFx,
  cut: REEL.cut, move: REEL.move, T: REEL.T,
  steps: EN.steps.map((s, i) => ({ ...s, dur: REEL.steps[i].dur, move: REEL.steps[i].move })),
};
