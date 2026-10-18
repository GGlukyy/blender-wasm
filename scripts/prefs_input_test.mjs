// Edit ▸ Preferences ▸ Input: zaškrtnout „Emulate 3 Button Mouse“ myší (UI cesta, ne Python). node prefs_input_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errs = 0; page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); if (/out of bounds|signature mismatch|Uncaught/.test(t)) { errs++; console.log("CRASH", t.slice(0, 160)); } });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(300);
await page.mouse.click(75, 13); await wait(800);
await page.mouse.click(125, 271); await wait(2500);   // Preferences
const tab = process.env.PREF_TAB_Y ? Number(process.env.PREF_TAB_Y) : 0;
await page.locator("#canvas").screenshot({ path: "out/prefs_in_0.png" });
if (tab) { await page.mouse.move(70, tab, { steps: 5 }); await wait(400); await page.mouse.down(); await wait(120); await page.mouse.up(); await wait(1200); await page.locator("#canvas").screenshot({ path: "out/prefs_in_1.png" }); }
const cx = process.env.PREF_CB_X ? Number(process.env.PREF_CB_X) : 0, cy = process.env.PREF_CB_Y ? Number(process.env.PREF_CB_Y) : 0;
if (cx) { await page.mouse.move(cx, cy, { steps: 5 }); await wait(400); await page.mouse.down(); await wait(120); await page.mouse.up(); await wait(2500); await page.locator("#canvas").screenshot({ path: "out/prefs_in_2.png" }); await page.mouse.down(); await wait(120); await page.mouse.up(); await wait(2500); }
await wait(1500);
console.log("PK crashes", errs);
console.log(errs === 0 ? "PASS: Emulate 3 Button Mouse přes UI nespadl" : "FAIL: pád");
await browser.close();
