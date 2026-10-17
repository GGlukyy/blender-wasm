// Únik GPU paměti: opakované Tab (edit/object), přepínání workspace a Material Preview; tex a tex_mb z ?perf=1 se nesmí trvale zvyšovat. node leak_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `pass`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("TL "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/).map(Number); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const perf = async () => { await wait(1500); const p = await page.evaluate(() => window.__PERF__ || {}); return { tex: p.tex, mb: p.tex_mb }; };
const kick = async () => { await page.mouse.move(600, 450); await page.mouse.move(610, 455); await wait(300); };
let fails = 0; const log = [];
await page.mouse.move(600, 450); await kick();
const base = await perf(); log.push(["base", base]);
for (let round = 1; round <= 5; round++) {
  for (let i = 0; i < 15; i++) { await page.keyboard.press("Tab"); await wait(250); }
  await page.mouse.click(655, 13); await wait(5000);     // Shading
  await page.mouse.click(287, 13); await wait(4000);     // Layout
  await kick(); const p = await perf(); log.push(["round" + round, p]);
}
log.forEach(([n, p]) => console.log(`LEAK ${n} tex=${p.tex} mb=${p.mb}`));
const first = log[2][1], fin = log[log.length - 1][1];
// po prvním kole (zahřátí cache) už nesmí růst
const grow = fin.mb - first.mb, growN = fin.tex - first.tex;
console.log(`LEAK growth after round2 (warm-up = round1): mb=${grow} tex=${growN}`);
console.log(errs === 0 && grow <= 20 && growN <= 10 ? "PASS: leak" : "FAIL: leak");
await page.locator("#canvas").screenshot({ path: "out/leak_end.png" });
await browser.close();
