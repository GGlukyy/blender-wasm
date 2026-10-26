// H9: Wireframe shading + otočení pohledu (gizmo se nesmí duplikovat, tvary musí být vidět). Screenshoty out/wire_*.png.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('Metal'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.25
b.inputs['Base Color'].default_value = (0.9, 0.35, 0.1, 1.0); ob.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -1))
def shade(t):
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = t
    print('SHADE ' + t); sys.stdout.flush(); return None
bpy.app.timers.register(lambda: shade('WIREFRAME'), first_interval=10.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0;
page.on("console", (m) => { const t = m.text(); if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
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
await wait(12000); await page.screenshot({ path: "out/wire_0.png" });
for (let i = 0; i < 3; i++) { await page.keyboard.press("Numpad4"); await wait(700); }
await page.keyboard.press("Numpad8"); await wait(1500); await page.screenshot({ path: "out/wire_1.png" });
for (let i = 0; i < 3; i++) { await page.keyboard.press("Numpad6"); await wait(700); }
await wait(1500); await page.screenshot({ path: "out/wire_2.png" });
console.log("ERRORS " + errors);
await browser.close();
