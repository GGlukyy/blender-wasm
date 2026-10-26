// Material Preview + Rendered v 3D viewportu: opice s kovovým materiálem. Screenshoty out/shading_*.png.
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
bpy.app.timers.register(lambda: shade('MATERIAL'), first_interval=10.0)
bpy.app.timers.register(lambda: shade('RENDERED'), first_interval=40.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0;
const rpseen = new Set(); page.on("console", (m) => { const t = m.text(); if (/WGPU_RP /.test(t) && /sz=8192/.test(t)) { const k = t.replace(/[0-9.]+/g, "").slice(0, 80) + (t.match(/vp=[-\d,]+/) || [""])[0]; if (!rpseen.has(k) && rpseen.size < 8) { rpseen.add(k); console.log("RP8192 " + t.slice(0, 260)); } } if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; window.__CAPENV = { WGPU_LOG_RP: "1" }; }, expr);
await page.goto("http://localhost:5173/?perf=1&tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + 570, box.y + 395); await page.keyboard.press("Home"); await wait(1500);
await wait(14000); { const q = await page.evaluate(() => [window.__PERF__ || {}, window.__GPUMEM__ || {}]); console.log(`HEAPUSED material used=${Math.round(q[0].heap_used_mb)} tex_mb=${q[1].tex_mb} buf_mb=${q[1].buf_mb}`); } { const th = await page.evaluate(() => (window.__GPUMEM__ || {}).thist || {}); const bpp = f => /rgba32float/.test(f) ? 16 : /rgba16float/.test(f) ? 8 : /32float-stencil8/.test(f) ? 5 : /r32|depth32|rg16|rgba8|rg11|rgb10/.test(f) ? 4 : /rg8|r16|depth16/.test(f) ? 2 : 1; const arr = Object.entries(th).map(([k, n]) => { const m = k.split("/"); const [w, h] = m[m.length - 1].split("x").map(Number); return [Math.round(n * w * h * bpp(m[m.length - 2]) / 1048576), n, k]; }).sort((a, b) => b[0] - a[0]).slice(0, 14); for (const a of arr) console.log("TBIG " + a.join(" ")); } await page.screenshot({ path: "out/shading_material.png" });
await wait(35000); await page.screenshot({ path: "out/shading_rendered.png" });
const pp = await page.evaluate(() => [window.__PERF__ || {}, window.__GPUMEM__ || {}]); console.log(`HEAPUSED used=${Math.round(pp[0].heap_used_mb)} res=${Math.round(pp[0].heap_mb)} tex_mb=${pp[1].tex_mb} buf_mb=${pp[1].buf_mb}`);
console.log("ERRORS " + errors);
await browser.close();
