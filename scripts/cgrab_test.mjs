// G1: Continuous Grab = Pointer Lock při tažení hodnoty. node cgrab_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def _t():
    try:
        o = bpy.context.view_layer.objects.active
        print('CG X', round(o.location.x, 3) if o else 'none'); sys.stdout.flush()
    except Exception as e: print('CG ERR', e); sys.stdout.flush()
    return 0.5
bpy.app.timers.register(_t, first_interval=6.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let x = null;
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300)));
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("CG X "); if (i >= 0) x = parseFloat(t.slice(i + 5)); if (/CG ERR/.test(t)) console.log("RAW", t.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(16000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
// Properties editor: Object tab, Location X field (viz out/win/gp_nodual_0.png, UI 1400x850)
const fx = box.x + 1318, fy = box.y + 318;
await page.screenshot({ path: "out/cgrab_before.png" });
const x0 = x;
await page.mouse.move(fx, fy); await wait(300);
await page.mouse.down(); await wait(100);
for (let i = 1; i <= 10; i++) { await page.mouse.move(fx + i * 8, fy); await wait(40); }
const locked = await page.evaluate(() => document.pointerLockElement && document.pointerLockElement.id);
console.log("pointerLockElement při tažení:", locked);
// dál „za okraj“: součet pohybu mnohem větší než zbytek canvasu vpravo (1400-1318=82 px)
for (let i = 1; i <= 40; i++) { await page.mouse.move(fx + 80 + i * 20, fy); await wait(30); }
await wait(600);
const x1 = x;
await page.mouse.up(); await wait(800);
const after = await page.evaluate(() => document.pointerLockElement ? document.pointerLockElement.id : null);
await page.screenshot({ path: "out/cgrab_after.png" });
console.log("X před/po:", x0, x1, "lock po puštění:", after);
console.log(locked === "canvas" && x1 > x0 && after === null ? "PASS: pointer lock při tažení, uvolněn po puštění" : "FAIL");
await browser.close();
