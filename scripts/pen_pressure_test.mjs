// Pencil tlak ve sculptu: dva stejné tahy se slabým (0.15) a silným (1.0) tlakem. Původně: Sculpt: ico sphere, SCULPT mode, tah myší přes kouli -> geometrie se musí změnit (max poloměr / součet z).
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
const ctx = page.context();
const cdp = await ctx.newCDPSession(page);
const pen = (type, x, y, buttons, force) => cdp.send("Input.dispatchMouseEvent", { type, x: box.x + x, y: box.y + y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, pointerType: "pen", force, tiltX: 0, tiltY: 0, clickCount: type === "mouseMoved" ? 0 : 1 });
const g = (s, k) => Number((s.match(new RegExp(k + "=([-\\d.]+)")) || [])[1]);
const stroke = async (x0, y0, x1, y1, force) => {
  await pen("mouseMoved", x0, y0, 0, 0); await pen("mousePressed", x0, y0, 1, force);
  for (let i = 1; i <= 25; i++) { await pen("mouseMoved", x0 + (x1 - x0) * i / 25, y0 + (y1 - y0) * i / 25, 1, force); await wait(16); }
  await pen("mouseReleased", x1, y1, 0, 0); await wait(1500);
};
const z0 = g(last, "sumz");
await stroke(c.x - 150, c.y - 60, c.x - 60, c.y - 60, Number(process.argv[2] || 0.15)); const z1 = g(last, "sumz");
await stroke(c.x + 60, c.y + 60, c.x + 150, c.y + 60, 1.0); const z2 = g(last, "sumz");
const d1 = z1 - z0, d2 = z2 - z1;
console.log(`slabý tlak Δsumz=${d1.toFixed(3)}  silný tlak Δsumz=${d2.toFixed(3)}  poměr=${(d2 / Math.max(d1, 1e-6)).toFixed(1)}`);
await page.screenshot({ path: "out/pen_pressure.png" });
console.log(d1 > 0 && d2 > 1.8 * d1 && errors === 0 ? "PASS: tlak Pencilu mění sílu štětce" : "FAIL: tlak se neprojevil");
await browser.close();
