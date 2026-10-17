// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    try:
        st['n'] += 1
        if st['n'] == 2:
            sc = bpy.context.scene
            sc.use_nodes = True
            w = bpy.context.window_manager.windows[0]
            for a in w.screen.areas:
                if a.type == 'VIEW_3D':
                    a.spaces[0].shading.use_compositor = 'ALWAYS'
        print('VPC', 'comp', st['n'], 0, 0, 0, 0, 0, 0); sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null;
const ring = [];
let dbg = false; page.on("pageerror", e => { console.log("LAST_DRAWS\n" + ring.join("\n")); console.log("PAGEERROR", String(e.stack || e).slice(0,600)); }); page.on("crash", () => console.log("PAGECRASH"));
page.on("console", (m) => { const t = m.text(); if (t.startsWith("DRAWLOG") || t.startsWith("[err] DRAWLOG")) { ring.push(t); if (ring.length > 14) ring.shift(); }
  if (dbg && !/DRAWLOG/.test(t) && /ssert|abort|Abort|error|Error/.test(t) && !/OpenImageIO|PNG|multiproc/.test(t)) console.log("DBG", t.slice(0,1200)); if (dbg && !/WGPU|VPC|PASSLOG/.test(t)) console.log("DBG", t.slice(0, 220)); const i = t.indexOf("VPC "); if (i >= 0) { if (/ERR|SAVED/.test(t)) console.log("RAW", t.slice(0, 300)); last = t.slice(i + 4).trim().split(/\s+/); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const exported = new Map();
if (process.env.SEEDOUT) await page.addInitScript(() => { window.__CAPENV = { WGPU_WGSL_EXPORT: "1" }; });
page.on("console", (m) => { const t = m.text(); if (dbg && /DRAWLOG|ssert|abort|Abort|error|Error/.test(t) && !/OpenImageIO|PNG|multiproc/.test(t)) console.log("DBG", t.slice(0,1200)); if (t.startsWith("WGSL_EXPORT ")) { const [k, v] = JSON.parse(t.slice(12)); exported.set(k, v); } });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
dbg = true; await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 576, y: box.y + 396 };
await wait(3000);
await page.keyboard.press("Escape"); await wait(500);
const n0 = +last[1]; await wait(8000);
let alive = false; for (let k = 0; k < 90 && !alive; k++) { await wait(1000); alive = +last[1] > n0 + 4; }
await page.screenshot({ path: "out/compositor.png" });
console.log(alive ? "PASS: viewport compositor (use_nodes + ALWAYS) žije" : "FAIL: viewport compositor zamrzl/spadl");
await browser.close();
