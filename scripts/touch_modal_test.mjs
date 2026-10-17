// Dotyk + modal operátor z lišty: G → tah prstem hýbe objektem (ne orbit), klepnutí potvrdí. node touch_modal_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        for a in bpy.context.window_manager.windows[0].screen.areas:
            if a.type == 'VIEW_3D': q = a.spaces[0].region_3d.view_rotation
        print('MPROBE obj=%.3f,%.3f,%.3f rot=%.4f,%.4f,%.4f,%.4f' % (ob.location.x, ob.location.y, ob.location.z, q.w, q.x, q.y, q.z)); sys.stdout.flush()
    except Exception as e: print('MPROBE ERR', e); sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let last = ""; let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("MPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 400); await wait(300);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y, id = 0) => ({ x: box.x + x, y: box.y + y, id, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const parse = () => { const m = last.match(/obj=([-\d.,]+) rot=([-\d.,]+)/); return m ? { obj: m[1].split(",").map(Number), rot: m[2].split(",").map(Number) } : null; };
const st = async () => { await wait(1000); return parse(); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
const bar = (label) => page.locator("#touchbar button", { hasText: new RegExp("^" + label + "$") }).first().click();
const s0 = await st();
await bar("G"); await wait(300);
const armed = await page.evaluate(() => window.__touchDebug().modalArmed); check("G zapne modal pad", armed === true);
await touch("touchStart", [P(500, 450)]); await wait(100);
for (let i = 1; i <= 12; i++) { await touch("touchMove", [P(500 + i * 12, 450)]); await wait(40); }
await touch("touchEnd", []); await wait(300);
const s1 = await st();
check("tah prstem hýbe objektem", diff(s0.obj, s1.obj) > 0.1, `obj Δ=${diff(s0.obj, s1.obj).toFixed(3)}`);
check("pohled se neotočil", diff(s0.rot, s1.rot) < 0.001, `rot Δ=${diff(s0.rot, s1.rot).toFixed(4)}`);
await touch("touchStart", [P(300, 600)]); await wait(80); await touch("touchEnd", []); await wait(500);   // klepnutí = potvrdit
const armed2 = await page.evaluate(() => window.__touchDebug().modalArmed); check("klepnutí vypne modal pad", armed2 === false);
const s2 = await st(); check("objekt zůstal po potvrzení", diff(s1.obj, s2.obj) < 0.05, `Δ=${diff(s1.obj, s2.obj).toFixed(3)}`);
await touch("touchStart", [P(500, 450)]); await wait(100);
for (let i = 1; i <= 12; i++) { await touch("touchMove", [P(500 + i * 10, 450 + i * 3)]); await wait(40); }
await touch("touchEnd", []);
const s3 = await st(); check("po potvrzení prst zase orbituje", diff(s2.rot, s3.rot) > 0.02, `rot Δ=${diff(s2.rot, s3.rot).toFixed(3)}`);
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: touch modal" : "FAIL: touch modal " + fail);
await browser.close();
