// Výběr více vrcholů prstem: klepnutí na vrchol, sticky Shift + klepnutí na další → 2 vybrané. node touch_shiftsel_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, bmesh
from bpy_extras import view3d_utils
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        scr = bpy.context.window_manager.windows[0].screen
        a = next(x for x in scr.areas if x.type == 'VIEW_3D'); r = next(x for x in a.regions if x.type == 'WINDOW'); rv = a.spaces[0].region_3d
        sel = -1; pts = ''
        if ob.mode == 'EDIT':
            bm = bmesh.from_edit_mesh(ob.data); sel = sum(1 for v in bm.verts if v.select)
            vs = sorted(bm.verts, key=lambda v: (ob.matrix_world @ v.co).z)
            cs = []
            for v in vs[-4:]:
                p = view3d_utils.location_3d_to_region_2d(r, rv, ob.matrix_world @ v.co)
                if p: cs.append('%d,%d' % (a.x + p.x, a.y + (r.height - p.y) + 0))
            pts = ';'.join(cs)
        print('SPROBE mode=%s sel=%d pts=%s' % (ob.mode, sel, pts)); sys.stdout.flush()
    except Exception as e: print('SPROBE ERR', e); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage(); let last = ""; let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("SPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const tap = async (x, y) => { const p = [{ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 }]; await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: p }); await wait(70); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await wait(600); };
const g = async () => { await wait(1000); const m = last.match(/mode=(\S+) sel=(-?\d+) pts=(.*)/); return m ? { mode: m[1], sel: +m[2], pts: m[3].split(";").filter(Boolean).map((s) => s.split(",").map(Number)) } : {}; };
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
await page.mouse.move(700, 450); await wait(300);
await page.locator("#touchbar button", { hasText: /^Tab$/ }).click(); await wait(700);
await page.locator("#touchbar button", { hasText: /^1$/ }).click(); await wait(300);
await page.locator("#touchbar button", { hasText: /^Alt$/ }).click(); await page.locator("#touchbar button", { hasText: /^A$/ }).click(); await page.locator("#touchbar button", { hasText: /^Alt$/ }).click(); await wait(600);
const s0 = await g(); check("nic nevybráno, mám souřadnice vrcholů", s0.sel === 0 && s0.pts.length >= 3, JSON.stringify(s0));
await tap(...s0.pts[0]); const s1 = await g(); check("klepnutí vybere 1 vrchol", s1.sel === 1, JSON.stringify({ sel: s1.sel }));
await page.locator("#touchbar button", { hasText: /^Shift$/ }).click(); await wait(200);
await tap(...s0.pts[1]); const s2 = await g(); check("Shift + klepnutí přidá 2. vrchol", s2.sel === 2, JSON.stringify({ sel: s2.sel }));
await tap(...s0.pts[2]); const s3 = await g(); check("Shift + klepnutí přidá 3. vrchol", s3.sel === 3, JSON.stringify({ sel: s3.sel }));
await page.locator("#touchbar button", { hasText: /^Shift$/ }).click(); await wait(200);
await tap(...s0.pts[0]); const s4 = await g(); check("bez Shift klepnutí nahradí výběr", s4.sel === 1, JSON.stringify({ sel: s4.sel }));
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: touch shiftsel" : "FAIL: touch shiftsel " + fail);
await browser.close();
