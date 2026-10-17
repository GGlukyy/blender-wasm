// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, bmesh
st = {'n': 0}
def _t():
    try:
        st['n'] += 1
        win = bpy.context.window_manager.windows[0]
        if st['n'] == 1:
            pass
        if st['n'] == 3:
            ob = bpy.context.view_layer.objects.active
            with bpy.context.temp_override(window=win, screen=win.screen, active_object=ob, object=ob):
                bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project()
        ob = bpy.context.view_layer.objects.active
        uvs = 0.0; ua = None
        if ob and ob.type == 'MESH' and ob.data.uv_layers:
            bm = bmesh.from_edit_mesh(ob.data) if ob.mode == 'EDIT' else None
            if bm:
                l = bm.loops.layers.uv.active
                uvs = sum(lp[l].uv.x for f in bm.faces for lp in f.loops)
        area = [a for a in win.screen.areas if a.type == 'IMAGE_EDITOR']
        a = area[0] if area else None
        geo = (a.x, a.y, a.width, a.height, win.height) if a else (0, 0, 0, 0, win.height)
        print('VPC', ob.mode if ob else '-', st['n'], round(uvs, 4), geo[0], geo[1], geo[2], geo[3], geo[4]); sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=6.0)`;
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
for (let i = 0; i < 3; i++) { await page.keyboard.down("Control"); await page.keyboard.press("PageDown"); await page.keyboard.up("Control"); await wait(i === 2 ? 6000 : 3000); }
await wait(3000);
const g = last.map(Number); // mode n uvsum ax ay aw ah winh
console.log("UV_AREA", JSON.stringify(g), last[0]);
const before = g[2];
const cx = box.x + g[3] + g[5] / 2, cy = box.y + (g[7] - (g[4] + g[6] / 2));
await page.mouse.move(cx, cy); await wait(300);
await page.keyboard.press("a"); await wait(300);
await page.keyboard.press("g"); await page.mouse.move(cx + 80, cy, { steps: 8 }); await wait(300);
await page.mouse.click(cx + 80, cy); await wait(2500);
await page.screenshot({ path: "out/uvedit.png" });
const after = +last[2];
console.log(`UV sum before=${before} after=${after}`);
console.log(Math.abs(after - before) > 0.01 ? "PASS: UV Editing — G posunulo UV" : "FAIL: UV se nepohnulo");
await browser.close();
