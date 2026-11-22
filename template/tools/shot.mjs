// node tools/shot.mjs page.html out.jpg 1600x900  — screenshot a local HTML file (covers)
import { chromium } from 'playwright-core'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const [f, out, size] = process.argv.slice(2); const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ channel: 'chrome', headless: true }); const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto(pathToFileURL(path.resolve(f)).href); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: out, type: out.endsWith('.jpg') ? 'jpeg' : 'png', ...(out.endsWith('.jpg') ? { quality: 94 } : {}) }); await b.close();
