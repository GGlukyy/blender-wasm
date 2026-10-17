// Move gizmo prstem: vyber Cube + nástroj Move, tah prstem za modrou šipku (Z) → Cube.location.z se změní, pohled se neotočí.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    o = bpy.data.objects['Cube']; scr = bpy.context.window_manager.windows[0].screen
    for a in scr.areas:
        if a.type == 'VIEW_3D':
            q = a.spaces[0].region_3d.view_rotation
            print('MPROBE loc=%.3f,%.3f,%.3f rot=%.4f,%.4f,%.4f,%.4f obj=%.3f,%.3f,%.3f,%.3f,%.3f,%.3f' % (*o.location, q.w, q.x, q.y, q.z, *o.rotation_euler, *o.scale)); sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let last = ""; page.on("console", m => { const t = m.text(); const i = t.indexOf("MPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(9000); await page.keyboard.press("Escape"); await wait(1500);
await page.mouse.click(577, 420); await wait(1000); await page.mouse.click(29, process.env.TOOLY ? +process.env.TOOLY : 178); await wait(1000); await page.mouse.move(800, 600); await wait(1500);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const parse = (s) => { const m = s.match(/loc=([-\d.,]+) rot=([-\d.,]+) obj=([-\d.,]+)/); return m ? { loc: m[1].split(",").map(Number), rot: m[2].split(",").map(Number), obj: m[3].split(",").map(Number) } : null; };
const state = async () => { await wait(1000); return parse(last); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const kind = process.env.KIND || "rotate";
const s0 = await state();
// najdi bod gizma: hover po kružnici kolem kostky, čekáme gizmo_hot == 1
let hit = null;
outer: for (const R of [60, 80, 100, 120, 45, 140]) for (let k = 0; k < 24; k++) {
  const x = 577 + R * Math.cos(k * Math.PI / 12), y = 397 + R * 0.9 * Math.sin(k * Math.PI / 12);
  await page.mouse.move(x, y); await wait(120);
  if (await page.evaluate(() => Module._blender_web_gizmo_hot())) { hit = [x, y]; break outer; }
}
console.log("gizmo hit", hit);
if (!hit) { console.log("FAIL " + kind + " gizmo: žádný bod gizma nenalezen"); await browser.close(); process.exit(1); }
await page.mouse.move(800, 700); await wait(300);
await touch("touchStart", [P(...hit)]); await wait(60);
for (let i = 1; i <= 24; i++) { await touch("touchMove", [P(hit[0] + i * 2, hit[1] + i * 3)]); await wait(16); }
await touch("touchEnd", []);
const s1 = await state();
const idx = kind === "rotate" ? [0, 1, 2] : [3, 4, 5];
const d = Math.hypot(...idx.map((i) => s1.obj[i] - s0.obj[i]));
const norot = diff(s0.rot, s1.rot) < 0.01;
console.log(`${kind}: obj ${s0.obj} -> ${s1.obj}; Δ=${d.toFixed(3)}; view rot Δ=${diff(s0.rot, s1.rot).toFixed(4)}`);
await page.screenshot({ path: `out/gizmo_${kind}.png` });
console.log(d > 0.02 && norot ? `PASS ${kind} gizmo prstem` : `FAIL ${kind} gizmo prstem`);
await browser.close();
