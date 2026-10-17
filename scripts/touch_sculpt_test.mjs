// Sculpt: Pencil (pen) maluje, prst orbituje — samotný pen tah změní geometrii a ne pohled; prst změní pohled a ne geometrii.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.0)
def probe():
    ob = bpy.context.view_layer.objects.active
    scr = bpy.context.window_manager.windows[0].screen
    for a in scr.areas:
        if a.type == 'VIEW_3D' and ob and ob.type == 'MESH':
            q = a.spaces[0].region_3d.view_rotation
            vs = ob.data.vertices
            print('SPT mode=%s rot=%.4f,%.4f,%.4f,%.4f maxr=%.4f sumz=%.3f' % (ob.mode, q.w, q.x, q.y, q.z, max(v.co.length for v in vs), sum(v.co.z for v in vs))); sys.stdout.flush()
            break
    return 0.5
bpy.app.timers.register(probe, first_interval=5.0)
def to_sculpt():
    bpy.ops.object.mode_set(mode='SCULPT'); return None
bpy.app.timers.register(to_sculpt, first_interval=10.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let last = "";
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("SPT "); if (i >= 0) last = t.slice(i + 4); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + 570, box.y + 395); await page.keyboard.press("Home"); await wait(1500);
for (let i = 0; i < 20 && !last.includes("mode=SCULPT"); i++) await wait(1000);
await wait(1500);
const cdp = await ctx.newCDPSession(page);
const parse = (s) => { const m = s.match(/rot=([-\d.,]+) maxr=([-\d.]+) sumz=([-\d.]+)/); return { rot: m[1].split(",").map(Number), maxr: +m[2], sumz: +m[3] }; };
const state = async () => { await wait(1200); return parse(last); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0; const check = (n, ok, e = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${e}`); if (!ok) fail++; };
const s0 = await state();
const pen = (type, x, y, buttons) => cdp.send("Input.dispatchMouseEvent", { type, x: box.x + x, y: box.y + y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, pointerType: "pen", clickCount: type === "mouseMoved" ? 0 : 1, force: 0.7 });
await pen("mouseMoved", 500, 395, 0); await pen("mousePressed", 500, 395, 1);
for (let i = 1; i <= 30; i++) { await pen("mouseMoved", 500 + i * 5, 395, 1); await wait(16); }
await pen("mouseReleased", 650, 395, 0);
const s1 = await state();
check("Pencil tah = sculpt (geometrie se změní)", Math.abs(s1.sumz - s0.sumz) > 0.01 || Math.abs(s1.maxr - s0.maxr) > 0.001, `maxr ${s0.maxr} -> ${s1.maxr}, sumz ${s0.sumz} -> ${s1.sumz}`);
check("Pencil tah neotočil pohled", diff(s0.rot, s1.rot) < 0.001, `rot Δ=${diff(s0.rot, s1.rot).toFixed(4)}`);
await page.screenshot({ path: "out/touch_sculpt.png" });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
await touch("touchStart", [P(300, 600)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(300 + i * 8, 600 + i)]); await wait(16); }
await touch("touchEnd", []);
const s2 = await state();
check("Prst v sculptu orbituje", diff(s1.rot, s2.rot) > 0.05, `rot Δ=${diff(s1.rot, s2.rot).toFixed(3)}`);
check("Prst nesculptoval", Math.abs(s2.sumz - s1.sumz) < 0.001 && Math.abs(s2.maxr - s1.maxr) < 0.0005, `maxr ${s1.maxr} -> ${s2.maxr}`);
console.log(fail === 0 ? "ALL PASS" : `FAILED ${fail}`);
await browser.close();
