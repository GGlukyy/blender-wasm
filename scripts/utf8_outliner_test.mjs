// Přejmenování v Outlineru znaky z soft klávesnice (příšera). node utf8_outliner_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, sys
def _t():
    try:
        ob = bpy.context.view_layer.objects.active
        print('OL', ob.name if ob else '-', ','.join(sorted(o.name for o in bpy.data.objects)), 'sel=' + ','.join(sorted(o.name for o in bpy.data.objects if o.select_get())), 'par=' + ','.join(o.name + '>' + o.parent.name for o in bpy.data.objects if o.parent)); sys.stdout.flush()
    except Exception as e: print('OL ERR', e); sys.stdout.flush()
    return 0.7
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("OL "); if (i >= 0) last = t.slice(i + 3).trim(); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(1250, 124); await wait(400);
const st = async () => { await wait(1600); return last || "none"; };
let fails = 0; const chk = async (n, re) => { const g = await st(); const ok = re.test(g); if (!ok) fails++; console.log(`OUTL ${n} ${ok ? "PASS" : "FAIL"} ${g}`); };
const soft = async (ch) => { await page.evaluate((c) => { for (const t of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(t, { key: c, code: "", bubbles: true, cancelable: true })); }, ch); await wait(120); };
await page.mouse.dblclick(1250, 124); await wait(600); await page.keyboard.press("Control+a");
for (const ch of "příšera") await soft(ch);
await page.keyboard.press("Enter");
await chk("rename_soft_utf8", /příšera/);
await page.locator("#canvas").screenshot({ path: "out/utf8_outliner.png" });
console.log("errors", errs);
console.log(errs === 0 && fails === 0 ? "PASS: utf8 outliner" : "FAIL: utf8 outliner " + fails);
await browser.close();
