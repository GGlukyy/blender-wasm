// M1: velký mesh (>65535 vertexů) v Solidu bez děr. UV koule 512x256 (131k vertexů), backface culling → díra = vidět pozadí.
// Měří: uvnitř siluety (kruh 0.92 poloměru) nesmí být pixely barvy pozadí. BM_SEG/BM_RING přepíšou rozlišení.
const { chromium } = await import(process.env.PW || "playwright");
const seg = process.env.BM_SEG || "512", ring = process.env.BM_RING || "256";
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_uv_sphere_add(segments=${seg}, ring_count=${ring}, radius=1.0)
bpy.ops.object.shade_smooth()
NM = ${process.env.BM_MATS || '0'}
if NM:
    import random
    random.seed(3)
    for i in range(NM): m = bpy.data.materials.new('M%d' % i); m.diffuse_color = (1, 0, 0, 1); bpy.context.object.data.materials.append(m)
    me = bpy.context.object.data
    me.attributes['material_index'].data.foreach_set('value', [random.randrange(NM) if '${process.env.BM_MODE || 'rand'}' == 'rand' else (i // 300) % NM for i in range(len(me.polygons))]) if 'material_index' in me.attributes else me.polygons.foreach_set('material_index', [random.randrange(NM) if '${process.env.BM_MODE || 'rand'}' == 'rand' else (i // 300) % NM for i in range(len(me.polygons))])
print('BM_COUNTS', len(bpy.context.object.data.vertices), len(bpy.context.object.data.polygons)); sys.stdout.flush()
def setup():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            sp = a.spaces[0]; sp.shading.type = 'SOLID'; sp.shading.show_backface_culling = True
            sp.shading.light = 'FLAT'; sp.shading.color_type = '${process.env.BM_MATS && process.env.BM_MATS !== '0' ? 'MATERIAL' : 'SINGLE'}'; sp.shading.single_color = (1, 0, 0)
            sp.overlay.show_overlays = False; sp.show_gizmo = False
            r = a.spaces[0].region_3d; r.view_perspective = 'ORTHO'
            with bpy.context.temp_override(area=a, region=[x for x in a.regions if x.type == 'WINDOW'][0]):
                bpy.ops.view3d.view_axis(type='FRONT'); bpy.ops.view3d.view_selected()
    print('BM_READY'); sys.stdout.flush(); return None
bpy.app.timers.register(setup, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0, counts = "";
page.on("console", (m) => { const t = m.text(); const c = /BM_COUNTS (\d+) (\d+)/.exec(t); if (c) counts = c[1] + " verts, " + c[2] + " faces";
  if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(9000); await page.keyboard.press("Escape"); await wait(12000);
const box = await page.locator("#canvas").boundingBox();
const png = await page.screenshot({ path: "out/bigmesh_" + seg + ".png", clip: { x: box.x + 70, y: box.y + 60, width: 1060, height: 700 } });
const res = await page.evaluate(async (b64) => {
  const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height), g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  const isRed = (i) => d[i] > 150 && d[i + 1] < 90 && d[i + 2] < 90;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (isRed((y * img.width + x) * 4)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return { red: 0 };
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.min(x1 - x0, y1 - y0) / 2 * 0.92;
  let inside = 0, holes = 0;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue; inside++;
    if (!isRed((y * img.width + x) * 4)) holes++;
  }
  return { red: 1, inside, holes, r: Math.round(r) };
}, png.toString("base64"));
console.log("BIGMESH " + counts + " " + JSON.stringify(res));
const ok = res.red && res.inside > 1000 && res.holes === 0 && errors === 0;
console.log((ok ? "PASS" : "FAIL") + " bigmesh seg=" + seg);
await browser.close();
