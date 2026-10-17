// Timeline přes UI: klik na pravítko = frame, přehrávání mezerníkem, Shift+Left, klíč I + G X. node timeline_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, sys
def _t():
    try:
        sc = bpy.context.scene; ob = bpy.data.objects['Cube']
        print('TL', sc.frame_current, round(ob.location.x, 2), 1 if bpy.context.screen.is_animation_playing else 0, 1 if ob.animation_data and ob.animation_data.action else 0); sys.stdout.flush()
    except Exception as e: print('TL ERR', e); sys.stdout.flush()
    return 0.5
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("TL "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/).map(Number); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const st = async () => { await wait(1500); return last || [0, 0, 0, 0]; };
let fails = 0; const chk = (n, ok, g) => { if (!ok) fails++; console.log(`TLINE ${n} ${ok ? "PASS" : "FAIL"} ${JSON.stringify(g)}`); };
await page.mouse.move(600, 450); await wait(300);
await page.mouse.click(300, 808); let g = await st(); chk("scrub_click", g[0] > 50 && g[0] < 70, g);
await page.mouse.move(600, 450); await page.keyboard.press("Shift+ArrowLeft"); g = await st(); chk("jump_start", g[0] === 1, g);
// klíč na 1, přesun na 40, posun X, klíč
await page.mouse.click(577, 396); await wait(200);
await page.mouse.move(600, 450); await page.keyboard.press("i"); await wait(500);
await page.mouse.click(250, 808); await wait(500);
await page.mouse.move(600, 450); await page.keyboard.press("g"); await page.keyboard.press("x"); await page.keyboard.type("3"); await page.keyboard.press("Enter"); await wait(300);
await page.keyboard.press("i"); g = await st(); chk("keys_created", g[3] >= 1 && g[1] === 3, g);
await page.mouse.click(44, 808); g = await st(); chk("back_to_1", g[0] <= 2 && Math.abs(g[1]) < 0.05, g);
await page.mouse.move(600, 450); await page.keyboard.press("Space"); await wait(2500); g = await st(); chk("playing", g[2] === 1, g);
await page.keyboard.press("Space"); g = await st(); chk("stopped_advanced", g[2] === 0 && g[0] > 5, g);
await page.locator("#canvas").screenshot({ path: "out/timeline_1.png" });
console.log("errors", errs);
console.log(errs === 0 && fails === 0 ? "PASS: timeline" : "FAIL: timeline " + fails);
await browser.close();
