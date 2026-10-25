// K1: teploměr "rychlé tažení plochy": kostka -> edit -> plocha -> G -> prudké pohyby myši DUR s.
// node drag_test.mjs [dur_s]  -> řádky DRAGROW (za 1 s) a DRAGSUM (průměr/s, max živých), PASS/FAIL
const { chromium } = await import(process.env.PW || "playwright");
const DUR = +(process.argv[2] || 10);
const expr = `import bpy, bmesh
def go():
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(bpy.context.object.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(bpy.context.object.data)
    print('DRAGREADY')
    return None
bpy.app.timers.register(go, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300))); page.on("crash", () => console.log("PAGECRASH"));
let ready = false, lost = false;
page.on("console", m => { const t = m.text(); if (/DRAGREADY/.test(t)) ready = true; if (/WGPU_FREES/.test(t)) console.log(t.slice(0, 160)); if (/WEBGPU_LOST/.test(t)) { lost = true; console.log("LOST", t.slice(0, 200)); } });
await page.addInitScript(() => {}); await page.addInitScript(([e, nopool]) => { window.__BARGS = ["--python-expr", e]; window.__LOGFREES = true; if (nopool) window.__CAPENV = { WGPU_NO_POOL: "1" }; if (window.__LOGFREES) window.__CAPENV = { ...(window.__CAPENV||{}), WGPU_LOG_FREES: "1" }; }, [expr, !!process.env.NOPOOL]);
await page.goto("http://localhost:5173/?perf=1&tel=1&touch=1" + (process.env.MOVECAP ? "&movecap=" + process.env.MOVECAP : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await new Promise(r => setTimeout(r, 1000));
// zahřátí: počkej, až se shadery přeloží a Blender kreslí plynule (jinak tažení "stojí", FPS ~1)
for (let i = 0; i < 120; i++) { const d = await page.evaluate(() => window.__PERF__ ? window.__PERF__.dt_avg_ms : 9999); if (d < 150) break; await page.mouse.move(700 + (i % 2) * 30, 400); await new Promise(r => setTimeout(r, 1000)); }
const snap = () => page.evaluate(() => ({ g: window.__GPUMEM__ || {}, p: window.__PERF__ || {}, t: performance.now() }));
await page.mouse.move(700, 400); await new Promise(r => setTimeout(r, 500));
const ctx = page.context(); const cdp = await ctx.newCDPSession(page); const box = await page.locator("#canvas").boundingBox();
const T = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 }] });
await page.locator("#touchbar button", { hasText: /^G$/ }).first().click(); await new Promise(r => setTimeout(r, 300)); await T("touchStart", 700, 450);
await new Promise(r => setTimeout(r, 500));
const s0 = await snap(); let prev = s0, maxLive = 0, moves = 0;
const rows = [];
const end = Date.now() + DUR * 1000; let lastSnap = Date.now(), a = 0;
while (Date.now() < end) {
  a += 0.9; // prudké pohyby přes celé okno (jako prst)
  for (let k = 0; k < 8; k++) { await T("touchMove", 700 + Math.cos(a + k * 0.05) * 450, 450 + Math.sin((a + k * 0.05) * 1.3) * 300); moves++; await new Promise(r => setTimeout(r, 8)); }
  if (Date.now() - lastSnap >= 1000) {
    lastSnap = Date.now(); const s = await snap(); const dt = (s.t - prev.t) / 1000;
    const r = { buf_new: (s.g.buf_new - prev.g.buf_new) / dt, destroyed: (s.g.buf_destroyed - prev.g.buf_destroyed) / dt, live: s.g.buf, submits: s.p.submits, passes: s.p.passes, fps: s.p.dt_avg_ms ? 1000 / s.p.dt_avg_ms : 0 };
    maxLive = Math.max(maxLive, s.g.buf || 0); rows.push(r); prev = s;
    console.log(`DRAGROW buf_new/s=${r.buf_new.toFixed(0)} destroyed/s=${r.destroyed.toFixed(0)} live=${r.live} submits=${r.submits} passes=${r.passes} fps=${r.fps.toFixed(0)}`);
  }
}
const sN = await snap(); const tot = (sN.t - s0.t) / 1000;
const keys = Object.keys(sN.g).filter(k => /tex.*new|new/.test(k));
console.log(`DRAGSUM dur=${tot.toFixed(1)}s mouse_moves=${moves} buf_new/s=${((sN.g.buf_new - s0.g.buf_new) / tot).toFixed(0)} max_live=${maxLive} new_keys=${keys.join(",")} tex_new/s=${sN.g.tex_new !== undefined ? ((sN.g.tex_new - s0.g.tex_new) / tot).toFixed(1) : "n/a"} gpumem=${JSON.stringify(sN.g)}`);
await page.screenshot({ path: "drag_end.png" }).catch(() => {});
await T("touchEnd", 0, 0); await page.keyboard.press("Escape");
await new Promise(r => setTimeout(r, 1500));
console.log(lost ? "FAIL drag (GPU lost)" : "PASS drag");
await browser.close();
