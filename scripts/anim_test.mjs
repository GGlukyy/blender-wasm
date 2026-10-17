// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    try:
        st['n'] += 1
        ob = bpy.context.scene.objects.get('Cube')
        n = 0
        ad = ob.animation_data if ob else None
        if ad and ad.action:
            try:
                n = sum(len(l.fcurves) for l in [ad.action.layers[0].strips[0].channelbags[0]]) if hasattr(ad.action, 'layers') and ad.action.layers else len(ad.action.fcurves)
            except Exception:
                n = len(ad.action.fcurves) if hasattr(ad.action, 'fcurves') else 1
        print('VPC', 'x', st['n'], bpy.context.scene.frame_current, round(ob.location.x, 3) if ob else 0, n, 0, 0, 0); sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=4.0)`;
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
const cx = box.x + 576, cy = box.y + 396;
await page.mouse.move(cx, cy); await page.mouse.click(cx, cy); await wait(500);
await page.keyboard.press("i"); await wait(1500);
console.log("AFTER_I", last.join(" "));
for (let i = 0; i < 12; i++) { await page.keyboard.press("ArrowRight"); await wait(150); }
await wait(800);
await page.keyboard.press("g"); await page.keyboard.press("x"); await page.mouse.move(cx + 80, cy, { steps: 6 }); await wait(300);
await page.mouse.click(cx + 80, cy); await wait(800);
await page.keyboard.press("i"); await wait(1500);
console.log("AFTER_2", last.join(" "));
// zpět na snímek 1 → kostka se vrátí na původní X; na 13 je posunutá
for (let i = 0; i < 12; i++) { await page.keyboard.press("ArrowLeft"); await wait(150); }
await wait(1500);
const x1 = +last[3]; console.log("FRAME1", last.join(" "));
for (let i = 0; i < 12; i++) { await page.keyboard.press("ArrowRight"); await wait(150); }
await wait(1500);
const x13 = +last[3]; console.log("FRAME13", last.join(" ")); await page.screenshot({ path: "out/anim.png" });
console.log(Math.abs(x1) < 1e-3 && x13 > 1 ? "PASS: animace — klíče I, posun G, scrub šipkami vrací správné hodnoty" : `FAIL: x1=${x1} x13=${x13}`);
await browser.close();
