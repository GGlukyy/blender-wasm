// File ▸ Export ▸ glTF přes UI. node export_ui_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, os, sys
def _t():
    p = '/opfs/home/Untitled.glb'
    print('EX', os.path.exists(p), os.path.getsize(p) if os.path.exists(p) else 0); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("EX "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(300);
await page.mouse.click(40, 13); await wait(700);
await page.mouse.click(73, 317); await wait(900);      // Export
await page.locator("#canvas").screenshot({ path: "out/exportui_1_menu.png" });
await page.mouse.move(250, 317); await wait(500);
await page.locator("#canvas").screenshot({ path: "out/exportui_2_sub.png" });
await page.mouse.move(330, 396, { steps: 4 }); await wait(500); await page.mouse.click(330, 396); await wait(15000);
await page.locator("#canvas").screenshot({ path: "out/exportui_3_dialog.png" });
await page.mouse.click(1327, 808); await wait(8000);
await page.locator("#canvas").screenshot({ path: "out/exportui_4_after.png" });
console.log("EX final", last && last.join(" "), "errors", errs);
console.log(last && last[0] === "True" && +last[1] > 500 && errs === 0 ? "PASS: export_ui glb" : "FAIL: export_ui glb");
await browser.close();
