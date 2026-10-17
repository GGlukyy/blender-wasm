// Move gizmo prstem: vyber Cube + nástroj Move, tah prstem za modrou šipku (Z) → Cube.location.z se změní, pohled se neotočí.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    o = bpy.data.objects['Cube']; scr = bpy.context.window_manager.windows[0].screen
    for a in scr.areas:
        if a.type == 'VIEW_3D':
            q = a.spaces[0].region_3d.view_rotation
            print('MPROBE loc=%.3f,%.3f,%.3f rot=%.4f,%.4f,%.4f,%.4f' % (*o.location, q.w, q.x, q.y, q.z)); sys.stdout.flush()
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
await page.mouse.click(577, 420); await wait(1000); await page.mouse.click(29, 178); await wait(1000); await page.mouse.move(800, 600); await wait(1500);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const parse = (s) => { const m = s.match(/loc=([-\d.,]+) rot=([-\d.,]+)/); return m ? { loc: m[1].split(",").map(Number), rot: m[2].split(",").map(Number) } : null; };
const state = async () => { await wait(1000); return parse(last); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const s0 = await state();
if (process.env.HOTDBG) { await page.mouse.move(577, 323); await wait(800); console.log('HOT after mouse hover on arrow:', await page.evaluate(() => Module._blender_web_gizmo_hot())); await page.mouse.move(800, 600); await wait(800); console.log('HOT away:', await page.evaluate(() => Module._blender_web_gizmo_hot())); }
if (process.env.MOUSE) { await page.mouse.move(577, 323); await wait(600); await page.mouse.down(); for (let i = 1; i <= 20; i++) { await page.mouse.move(577, 323 - i * 3); await wait(16); } await page.mouse.up(); }
else {
await touch("touchStart", [P(577, 323)]); await wait(30);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(577, 323 - i * 3)]); await wait(16); }
await touch("touchEnd", []);
}
const s1 = await state();
const moved = Math.abs(s1.loc[2] - s0.loc[2]) > 0.05, norot = diff(s0.rot, s1.rot) < 0.01;
console.log(`loc ${s0.loc} -> ${s1.loc}; rot Δ=${diff(s0.rot, s1.rot).toFixed(4)}`);
await page.screenshot({ path: "out/gizmo_move.png" });
console.log(moved && norot ? "PASS move gizmo prstem" : "FAIL move gizmo prstem");
await browser.close();
