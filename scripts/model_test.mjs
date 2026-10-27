// M1: načte testovací model (testmodel.blend vedle skriptu) do web buildu, vypíše statistiku a udělá screenshoty zepředu/zezadu.
// MODEL_VIEW=BACK|FRONT, MODEL_CULL=1 (backface culling → díry = pozadí). Screenshoty out/model_<view>.png.
const { chromium } = await import(process.env.PW || "playwright");
const view = process.env.MODEL_VIEW || "BACK", cull = process.env.MODEL_CULL === "1" ? "True" : "False";
const expr = `import bpy, sys, os
state = {'n': 0}
def stats():
    tv = tf = 0
    for ob in bpy.data.objects:
        if ob.type == 'MESH':
            d = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
            tv += len(d.vertices); tf += len(d.polygons)
            print('BM_OBJ', ob.name[:12], len(d.vertices), len(d.polygons), [m.type for m in ob.modifiers])
    print('BM_TOTAL', tv, tf, len(bpy.data.objects)); sys.stdout.flush()
def poll():
    if not os.path.exists('/uploads/m.blend'): return 0.5
    print('BM_OPEN'); sys.stdout.flush()
    bpy.ops.wm.open_mainfile(filepath='/uploads/m.blend')
    bpy.app.timers.register(setup, first_interval=6.0)
    return None
def setup():
    stats()
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            sp = a.spaces[0]; sp.shading.type = 'SOLID'; sp.shading.show_backface_culling = ${cull}
            sp.shading.light = 'STUDIO'; sp.overlay.show_overlays = False; sp.show_gizmo = False
            with bpy.context.temp_override(area=a, region=[x for x in a.regions if x.type == 'WINDOW'][0]):
                bpy.ops.view3d.view_axis(type='${view}'); bpy.ops.view3d.view_all()
            a.spaces[0].region_3d.view_distance *= float('${process.env.MODEL_ZOOM || '0.45'}')
${(await import('node:fs')).readFileSync('model_py.txt','utf8')}
    print('BM_READY'); sys.stdout.flush(); return None
bpy.app.timers.register(poll, first_interval=2.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0;
page.on("console", (m) => { const t = m.text(); if (/BM_/.test(t)) console.log(t.slice(0, 200));
  if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
const http = await import("node:http"), fs = await import("node:fs");
http.createServer((q, r) => { r.writeHead(200, { "content-type": "application/octet-stream", "content-length": fs.statSync("testmodel.blend").size, "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin" }); fs.createReadStream("testmodel.blend").pipe(r); }).listen(5198, "127.0.0.1");
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(3000); await page.keyboard.press("Escape");
await page.evaluate(async () => { const FS = window.Module.FS; try { FS.mkdir("/uploads"); } catch (e) {}
  const r = await fetch("http://127.0.0.1:5198/"); const rd = r.body.getReader(); const st = FS.open("/uploads/m.tmp", "w"); let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; FS.write(st, value, 0, value.length); n += value.length; }
  FS.close(st); FS.rename("/uploads/m.tmp", "/uploads/m.blend"); console.log("BM_WRITTEN " + n); });
await wait(75000);
await page.screenshot({ path: "out/model_" + view + (cull === "True" ? "_cull" : "") + (process.env.MODEL_TAG || "") + ".png" });
console.log("MODEL done errors=" + errors);
await browser.close();
process.exit(0);
