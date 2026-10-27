// H15c: jako shading_test, ale v scéně zapnuto raytracing + DOF + motion blur + volumetrika (detektor WGPU_RW_STORAGE_BAD). Material Preview + Rendered v 3D viewportu: opice s kovovým materiálem. Screenshoty out/shading_*.png.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('Metal'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.25
b.inputs['Base Color'].default_value = (0.9, 0.35, 0.1, 1.0); ob.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -1))
sc = bpy.context.scene
sc.eevee.use_raytracing = True; sc.render.use_motion_blur = True
try: sc.eevee.use_volumetric_shadows = True
except Exception: pass
bpy.ops.object.camera_add(location=(6, -6, 4), rotation=(1.1, 0, 0.8)); cam = bpy.context.object; sc.camera = cam
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = 8; cam.data.dof.aperture_fstop = 1.4
bpy.ops.object.light_add(type='POINT', location=(2, -2, 3))
sc.world.use_nodes = True
bpy.ops.object.lightprobe_add(type='VOLUME', location=(0, 0, 0))
def bake():
    try:
        bpy.ops.object.lightprobe_cache_bake(subset='ALL')
    except Exception as e: print('NOBAKE', e)
    return None
bpy.app.timers.register(bake, first_interval=25.0)
def shade(t):
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = t; a.spaces[0].region_3d.view_perspective = 'CAMERA'
    print('SHADE ' + t); sys.stdout.flush(); return None
bpy.app.timers.register(lambda: shade('MATERIAL'), first_interval=10.0)
bpy.app.timers.register(lambda: shade('RENDERED'), first_interval=40.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0;
page.on("console", (m) => { const t = m.text(); if (/AttributeError|NameError/.test(t)) console.log("PY " + t.slice(0, 200)); if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL|WGPU_RW_STORAGE_BAD/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + 570, box.y + 395); await page.keyboard.press("Home"); await wait(1500);
await wait(14000); await page.screenshot({ path: "out/shadingfx2_material.png" });
await wait(35000); await page.screenshot({ path: "out/shadingfx2_rendered.png" });
console.log("ERRORS " + errors);
await browser.close();
