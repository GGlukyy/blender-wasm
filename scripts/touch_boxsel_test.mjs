// Dotyk + modal operátor z lišty: G → tah prstem hýbe objektem (ne orbit), klepnutí potvrdí. node touch_modal_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        for a in bpy.context.window_manager.windows[0].screen.areas:
            if a.type == 'VIEW_3D': q = a.spaces[0].region_3d.view_rotation
        print('MPROBE sel=%d mode=%s' % (sum(1 for v in __import__('bmesh').from_edit_mesh(ob.data).verts if v.select) if ob.mode == 'EDIT' else -1, ob.mode)); sys.stdout.flush()
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
const parse = () => { const m = last.match(/sel=(-?\d+) mode=(\S+)/); return m ? { sel: +m[1], mode: m[2] } : null; };
const st = async () => { await wait(1000); return parse(); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
const bar = (label) => page.locator("#touchbar button", { hasText: new RegExp("^" + label + "$") }).first().click();
await bar("Tab"); await wait(800); await bar("1"); await wait(300);
await bar("Alt"); await wait(100); await bar("A"); await wait(200); await bar("Alt"); await wait(500);
const s0 = await st(); check("edit mode, nic nevybráno", s0.mode === "EDIT" && s0.sel === 0, JSON.stringify(s0));
await page.mouse.move(480, 320); await wait(200);
await bar("⋯"); await wait(200); await bar("B"); await wait(200);
const a1 = await page.evaluate(() => window.__touchDebug().modalArmed); check("B zapne pad", a1 === true);
await touch("touchStart", [P(300, 600)]); await wait(150);
for (let i = 1; i <= 15; i++) { await touch("touchMove", [P(300 + i * 12, 600 + i * 10)]); await wait(40); }
await touch("touchEnd", []); await wait(500);
const a2 = await page.evaluate(() => window.__touchDebug().modalArmed); check("po tahu se pad vypne", a2 === false);
const s1 = await st(); check("box select vybral vrcholy", s1.sel > 0 && s1.sel < 8, `sel ${s0.sel} -> ${s1.sel}`);
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: touch boxsel" : "FAIL: touch boxsel " + fail);
await browser.close();
