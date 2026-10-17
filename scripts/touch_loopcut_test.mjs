// Dotyk + modal operátor z lišty: G → tah prstem hýbe objektem (ne orbit), klepnutí potvrdí. node touch_modal_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        for a in bpy.context.window_manager.windows[0].screen.areas:
            if a.type == 'VIEW_3D': q = a.spaces[0].region_3d.view_rotation
        print('MPROBE nv=%d mode=%s' % (len(__import__('bmesh').from_edit_mesh(ob.data).verts) if ob.mode == 'EDIT' else len(ob.data.vertices), ob.mode)); sys.stdout.flush()
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
const parse = () => { const m = last.match(/nv=(\d+) mode=(\S+)/); return m ? { nv: +m[1], mode: m[2] } : null; };
const st = async () => { await wait(1000); return parse(); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
const bar = (label) => page.locator("#touchbar button", { hasText: new RegExp("^" + label + "$") }).first().click();
await bar("Tab"); await wait(800);
const s0 = await st(); check("edit mode", s0.mode === "EDIT", JSON.stringify(s0));
await page.mouse.move(553, 420); await wait(200);   // skutečná myš nad svislou hranou kostky
await bar("Ctrl"); await wait(100); await bar("R"); await wait(200); await bar("Ctrl"); await wait(200);
const a1 = await page.evaluate(() => window.__touchDebug().modalArmed); check("Ctrl+R zapne pad", a1 === true);
// malý tah prstem (hover se přesune o pár px po hraně), pak klepnutí = umístit, klepnutí = potvrdit posun
await touch("touchStart", [P(300, 600)]); await wait(100);
for (let i = 1; i <= 6; i++) { await touch("touchMove", [P(300, 600 - i * 3)]); await wait(40); }
await touch("touchEnd", []); await wait(400);
await touch("touchStart", [P(300, 600)]); await wait(80); await touch("touchEnd", []); await wait(700);
const a2 = await page.evaluate(() => window.__touchDebug().modalArmed); check("po 1. klepnutí je pad stále zapnutý (posun řezu)", a2 === true);
await touch("touchStart", [P(300, 600)]); await wait(80); await touch("touchEnd", []); await wait(900);
const a3 = await page.evaluate(() => window.__touchDebug().modalArmed); check("po 2. klepnutí se pad vypne", a3 === false);
const s1 = await st(); check("loop cut přidal vrcholy (8 -> 12)", s1.nv === 12, `${s0.nv} -> ${s1.nv}`);
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: touch loopcut" : "FAIL: touch loopcut " + fail);
await browser.close();
