// Soft-keyboard znaky mimo ASCII (ř š ž €) dorazí do Blenderu jako UTF-8. node utf8_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, sys
def _t():
    try:
        out = []
        for w in bpy.context.window_manager.windows:
            for a in w.screen.areas:
                if a.type == 'CONSOLE':
                    sb = a.spaces[0].scrollback
                    out = [l.body for l in sb][-8:]
        print('UK', repr(out).replace(' ', '_')); sys.stdout.flush()
    except Exception as e: print('UK ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("UK "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(300);
await page.mouse.click(1052, 13); await wait(6000);
await page.locator("#canvas").screenshot({ path: "out/console_1_ws.png" });
await page.mouse.move(200, 450); await wait(500);   // konzole je vlevo dole ve Scripting workspace
// soft klávesnice iOS: keydown s prázdným code a znakem v key (jako touch.js fixKey předpokládá)
const soft = async (ch) => { await page.evaluate((c) => { for (const t of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(t, { key: c, code: "", bubbles: true, cancelable: true })); }, ch); await wait(150); };
await page.keyboard.type("ord('", { delay: 60 });
await soft("ř");
await page.keyboard.type("')", { delay: 60 }); await page.keyboard.press("Enter"); await wait(2500);
await page.keyboard.type("len('", { delay: 60 });
await soft("€"); await soft("š");
await page.keyboard.type("')", { delay: 60 }); await page.keyboard.press("Enter"); await wait(2500);
await page.locator("#canvas").screenshot({ path: "out/utf8_typed.png" });
console.log("scrollback", JSON.stringify(last));
const txt = JSON.stringify(last);
const ok = txt.includes("345") && txt.includes("2");
console.log(ok && errs === 0 ? "PASS: utf8 (ord('ř')=345, len('€š')=2)" : "FAIL: utf8");
await browser.close();
