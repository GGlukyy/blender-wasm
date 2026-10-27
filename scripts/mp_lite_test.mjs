// H22a: s ?ipad=1 přepnutí na Material Preview dá Solid + Texture/Studio (MP Lite), ne šedý model. Screenshot out/mp_lite.png.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('Orange'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.9, 0.35, 0.1, 1.0); m.diffuse_color = (0.9, 0.35, 0.1, 1.0); ob.data.materials.append(m)
def shade():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = 'MATERIAL'
    return None
def report():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            s = a.spaces[0].shading; print('MPLITE ' + s.type + ' ' + s.light + ' ' + s.color_type); sys.stdout.flush()
def tweak():
    v = '${process.env.LITE_OFF || ""}'
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            sh = a.spaces[0].shading
            if 'shadow' in v: sh.show_shadows = False
            if 'cavity' in v: sh.show_cavity = False
            if 'spec' in v: sh.show_specular_highlight = False
            if 'tex' in v: sh.color_type = 'MATERIAL'
    return None
bpy.app.timers.register(tweak, first_interval=12.0)
bpy.app.timers.register(shade, first_interval=10.0)
bpy.app.timers.register(lambda: report(), first_interval=16.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0, lite = "";
page.on("console", (m) => { const t = m.text(); if (t.startsWith("MPLITE")) lite = t;
  if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL|WGPU_RW_STORAGE_BAD/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?ipad=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + 570, box.y + 395); await page.keyboard.press("Home");
await wait(14000); await page.screenshot({ path: "out/mp_lite.png" });
console.log(lite || "MPLITE (žádný výpis)");
const ok = lite === "MPLITE SOLID STUDIO TEXTURE" && errors === 0;
console.log((ok ? "PASS" : "FAIL") + " mp_lite errors=" + errors);
await browser.close();
process.exit(ok ? 0 : 1);
