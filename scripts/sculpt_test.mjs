// Sculpt: ico sphere, SCULPT mode, tah myší přes kouli -> geometrie se musí změnit (max poloměr / součet z).
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, math
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.0)
def probe():
    ob = bpy.context.view_layer.objects.active
    if ob and ob.type == 'MESH':
        vs = ob.data.vertices
        r = max(v.co.length for v in vs); sz = sum(v.co.z for v in vs)
        print('SPROBE mode=%s verts=%d maxr=%.4f sumz=%.3f' % (ob.mode, len(vs), r, sz)); sys.stdout.flush()
    return 0.5
bpy.app.timers.register(probe, first_interval=5.0)
def to_sculpt():
    bpy.ops.object.mode_set(mode='SCULPT'); return None
bpy.app.timers.register(to_sculpt, first_interval=12.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = "", errors = 0;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("SPROBE"); if (i >= 0) last = t.slice(i + 7); else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 570, y: box.y + 395 };
await page.mouse.move(c.x, c.y); await page.keyboard.press("Home"); await wait(1500);
for (let i = 0; i < 20 && !last.includes("mode=SCULPT"); i++) await wait(1000);
await wait(1500);
const before = last; console.log("before: " + before);
await page.screenshot({ path: "out/sculpt_before.png" });
// tah přes střed koule (Draw štětec): několik tahů
const N = Number((process.env.STROKES || "").replace(/%.*/, "")) || 3, tStroke = Date.now();
for (let k = 0; k < N; k++) {
  const yy = ((k % 5) - 2) * 18;
  await page.mouse.move(c.x - 70, c.y + yy); await page.mouse.down();
  await page.mouse.move(c.x + 70, c.y + yy, { steps: 30 }); await page.mouse.up(); await wait(N > 3 ? 100 : 600);
}
await wait(2000);
console.log(`STROKES ${N} total_ms=${Date.now() - tStroke} per_stroke_ms=${((Date.now() - tStroke) / N).toFixed(0)}`);
const after = last; console.log("after:  " + after);
await page.screenshot({ path: "out/sculpt_after.png" });
const g = (s, k) => Number((s.match(new RegExp(k + "=([-\\d.]+)")) || [])[1]);
const changed = Math.abs(g(after, "sumz") - g(before, "sumz")) > 0.01 || Math.abs(g(after, "maxr") - g(before, "maxr")) > 0.001;
console.log(changed && before.includes("SCULPT") && errors === 0 ? "PASS: sculpt tah změnil geometrii" : `FAIL: changed=${changed} errors=${errors}`);
await browser.close();
