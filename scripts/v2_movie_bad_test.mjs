// V2: nepodporovaný kodek (WebM/VP9 není v buildu) → červená lišta #movie-bad, ne tiché nic. node v2_movie_bad_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, os
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 320; sc.render.resolution_y = 180
sc.frame_start, sc.frame_end = 1, 3
c = bpy.data.objects['Cube']; c.location.x = 0; c.keyframe_insert('location', frame=1); c.location.x = 2; c.keyframe_insert('location', frame=40)
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'WEBM'; sc.render.ffmpeg.codec = 'WEBM'; sc.render.filepath = '/tmp/vxw_'
def _f(*a): print('VXF', flush=True)
bpy.app.handlers.render_complete.append(_f)
def _go():
    bpy.ops.render.render(animation=True)
bpy.app.timers.register(_go, first_interval=12.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const ev = []; let nf = 0;

await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/" + (process.env.Q ? "?" + process.env.Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
let bar = "";
for (let i = 0; i < 90 && !bar; i++) { await new Promise(r => setTimeout(r, 1000)); bar = await page.evaluate(() => document.getElementById("movie-bad")?.textContent || ""); }
await page.screenshot({ path: "out/v2mb_bar.png" });
console.log("BAR", bar);
console.log(bar ? "PASS: v2 movie-bad (lišta při nepodporovaném kodeku)" : "FAIL: v2 movie-bad");
await browser.close();
