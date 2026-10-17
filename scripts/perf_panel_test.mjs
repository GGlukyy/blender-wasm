// Výkonový panel: boot s ?perf=1, orbit myší (MMB), přečti window.__PERF__ + screenshot panelu.
//   scripts/perf_panel_win.sh
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(6000);
await page.keyboard.press("Escape"); await wait(1500);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 600, y: box.y + 400 };
await page.mouse.move(c.x, c.y);
await page.mouse.down({ button: "middle" });
for (let i = 0; i < 120; i++) { await page.mouse.move(c.x + 100 * Math.sin(i / 10), c.y + 40 * Math.cos(i / 10)); await wait(16); }
await page.mouse.up({ button: "middle" });
await wait(1500);
const perf = await page.evaluate(() => window.__PERF__ || null);
const text = await page.evaluate(() => [...document.querySelectorAll("div")].map(d => d.textContent).find(t => t && t.includes("FPS")) || "");
await page.screenshot({ path: "out/perf_panel.png" });
// nepřerušovaný redraw bez vstupních událostí: přehrávání animace (mezerník) -> dt = skutečná cena snímku
await page.keyboard.press("Space"); await wait(4000);
const play = await page.evaluate(() => window.__PERF__ || null);
await page.keyboard.press("Space"); await wait(500);
console.log("PLAY " + JSON.stringify(play));
// klid: bez vstupu a bez přehrávání by se neměly kreslit žádné snímky
const f0 = (await page.evaluate(() => window.__PERF__ || {})).frame || 0;
await wait(4000);
const f1 = (await page.evaluate(() => window.__PERF__ || {})).frame || 0;
console.log(`IDLE frames in 4 s: ${f1 - f0}`);
console.log("PERF " + JSON.stringify(perf));
console.log(perf && text.includes("FPS") ? "PASS: panel zobrazuje FPS" : "FAIL: panel bez dat");
await browser.close();
