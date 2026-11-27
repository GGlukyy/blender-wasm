// V2: nabídka stažení MP4 (WEB_EXPORT) přijde až PO dokončení renderu a jen jednou (ne s nedokončeným souborem). node v2_export_watch_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, os
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 320; sc.render.resolution_y = 180
sc.frame_start, sc.frame_end = 1, 40
c = bpy.data.objects['Cube']; c.location.x = 0; c.keyframe_insert('location', frame=1); c.location.x = 2; c.keyframe_insert('location', frame=40)
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/vxw_'
def _f(*a): print('VXF', flush=True)
bpy.app.handlers.render_complete.append(_f)
def _go():
    bpy.ops.render.render(animation=True)
bpy.app.timers.register(_go, first_interval=12.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const ev = []; let nf = 0;
page.on("console", (m) => { const t = m.text(); if (t.includes("VXF")) nf++; else if (t.includes("WEB_EXPORT") && t.includes("vxw_")) ev.push("export@" + nf); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/" + (process.env.Q ? "?" + process.env.Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
for (let i = 0; i < 120 && !ev.length; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 8000));
console.log("EVENTS", ev.join(","));
console.log("frames rendered", nf);
console.log(ev.length === 1 && nf >= 40 && ev[0] === "export@" + nf ? "PASS: v2 export watch (jedna nabídka po dokončení)" : "FAIL: v2 export watch");
await browser.close();
