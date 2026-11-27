// V2: zrušení video renderu (Esc po 5. snímku) + hned nový render do jiného souboru funguje (writer se zavřel). node v2_cancel_test.mjs
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
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/vxc1_'
def _f(*a): print('VXF', flush=True)
bpy.app.handlers.render_complete.append(_f)
def _go():
    bpy.ops.render.render(animation=True)
bpy.app.timers.register(_go, first_interval=12.0)
import glob
def _second():
    sc.frame_end = 6; sc.render.filepath = '/tmp/vxc2_'
    bpy.ops.render.render(animation=True)
    def _chk():
        g = glob.glob('/tmp/vxc2_*.mp4')
        try:
            c = bpy.data.movieclips.load(g[0]); print('VXC2', c.frame_duration, flush=True)
        except Exception as e: print('VXC2 ERR', e, flush=True)
    bpy.app.timers.register(_chk, first_interval=25.0)
bpy.app.timers.register(_second, first_interval=70.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let nf = 0, esc = false, c2 = null;
page.on("console", (m) => { const t = m.text(); if (t.includes("VXF")) { nf++; if (nf === 5) esc = true; } else if (t.includes("VXC2")) c2 = t; });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/" + (process.env.Q ? "?" + process.env.Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
let pressed = false;
for (let i = 0; i < 200 && !c2; i++) { if (esc && !pressed) { await page.mouse.move(700, 450); await page.keyboard.press("Escape"); pressed = true; } await new Promise(r => setTimeout(r, 1000)); }
console.log("frames rendered", nf, "esc", pressed, "second:", c2);
console.log(pressed && c2 && /VXC2 6/.test(c2) && nf < 40 + 6 + 2 ? "PASS: v2 cancel + nový render" : "FAIL: v2 cancel");
await browser.close();
