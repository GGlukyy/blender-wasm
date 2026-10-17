// Prst začne tah na navigačním gizmu „ruka“ (pan) → pohled se posune (loc), neotočí (rot). Kontrola: tah mimo gizmo otáčí.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    scr = bpy.context.window_manager.windows[0].screen
    for a in scr.areas:
        if a.type == 'VIEW_3D':
            r = a.spaces[0].region_3d; q = r.view_rotation; l = r.view_location
            print('GPROBE rot=%.4f,%.4f,%.4f,%.4f loc=%.3f,%.3f,%.3f dist=%.3f' % (q.w, q.x, q.y, q.z, l.x, l.y, l.z, r.view_distance)); sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let last = ""; page.on("console", m => { const t = m.text(); const i = t.indexOf("GPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y, id = 0) => ({ x: box.x + x, y: box.y + y, id, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const parse = (s) => { const m = s.match(/rot=([-\d.,]+) loc=([-\d.,]+) dist=([-\d.]+)/); return m ? { rot: m[1].split(",").map(Number), loc: m[2].split(",").map(Number), dist: +m[3] } : null; };
const state = async () => { await wait(1000); return parse(last); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
const drag = async (x, y, dx, dy) => { await touch("touchStart", [P(x, y)]); await wait(120); for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(x + dx * i / 20, y + dy * i / 20)]); await wait(16); } await touch("touchEnd", []); };
const s0 = await state();
await drag(1126, 217, -120, 60);            // ruka (pan)
const s1 = await state();
check("tah na gizmu ruka = pan", diff(s0.loc, s1.loc) > 0.05 && diff(s0.rot, s1.rot) < 0.01, `loc Δ=${diff(s0.loc, s1.loc).toFixed(3)} rot Δ=${diff(s0.rot, s1.rot).toFixed(4)}`);
await drag(500, 450, 160, 20);              // mimo gizmo = orbit
const s2 = await state();
check("tah mimo gizmo = orbit", diff(s1.rot, s2.rot) > 0.05, `rot Δ=${diff(s1.rot, s2.rot).toFixed(3)}`);
console.log(fail ? "FAIL gizmo touch" : "PASS gizmo touch");
await browser.close();
