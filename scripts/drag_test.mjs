// K1: teploměr "rychlé tažení plochy": kostka -> edit -> plocha -> G -> prudké pohyby myši DUR s.
// node drag_test.mjs [dur_s]  -> řádky DRAGROW (za 1 s) a DRAGSUM (průměr/s, max živých), PASS/FAIL
const { chromium } = await import(process.env.PW || "playwright");
const DUR = +(process.argv[2] || 10);
const expr = `import bpy, bmesh
def go():
    if '${process.env.OBJMODE || ''}': print('DRAGREADY'); return None
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(bpy.context.object.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(bpy.context.object.data)
    print('DRAGREADY')
    return None
bpy.app.timers.register(go, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300))); page.on("crash", () => console.log("PAGECRASH"));
let ready = false, lost = false;
page.on("console", m => { const t = m.text(); if (process.env.VERB && (!/WGPU_/.test(t) || /WGPU_(STATS|IMM|ERR|FAIL)|WEBGPU/.test(t))) console.log("C:", Math.round(performance.now()/1000), t.slice(0, 200)); if (/DRAGREADY/.test(t)) ready = true; if (/WGPU_FREES/.test(t)) console.log(t.slice(0, 160)); if (/WEBGPU_LOST/.test(t)) { lost = true; console.log("LOST", t.slice(0, 200)); } });
await page.addInitScript(() => {}); await page.addInitScript(([e, nopool, ring0]) => { window.__BARGS = ["--python-expr", e]; window.__LOGFREES = true; if (nopool) window.__CAPENV = { WGPU_NO_POOL: "1" }; if (window.__LOGFREES) window.__CAPENV = { ...(window.__CAPENV||{}), WGPU_LOG_FREES: "1" }; if (ring0) window.__CAPENV = { ...(window.__CAPENV||{}), WGPU_IMM_RING: "0" }; }, [expr, !!process.env.NOPOOL, !!process.env.RING0]);
await page.goto("http://localhost:5173/?perf=1&tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await new Promise(r => setTimeout(r, 1000));
// zahřátí: počkej, až se shadery přeloží a Blender kreslí plynule (jinak tažení "stojí", FPS ~1)
for (let i = 0; i < 120; i++) { const d = await page.evaluate(() => window.__PERF__ ? window.__PERF__.dt_avg_ms : 9999); if (d < 150) break; await page.mouse.move(700 + (i % 2) * 30, 400); await new Promise(r => setTimeout(r, 1000)); }
const snap = () => page.evaluate(() => ({ g: window.__GPUMEM__ || {}, p: window.__PERF__ || {}, t: performance.now() }));
await page.mouse.move(700, 400); await new Promise(r => setTimeout(r, 500));
await page.keyboard.press("g");
await new Promise(r => setTimeout(r, 500));
const s0 = await snap(); let prev = s0, maxLive = 0, moves = 0;
const rows = [];
const end = Date.now() + DUR * 1000; let lastSnap = Date.now(), a = 0;
while (Date.now() < end) {
  a += 0.9; // prudké pohyby přes celé okno (jako prst)
  await page.mouse.move(700 + Math.cos(a) * 450, 400 + Math.sin(a * 1.3) * 300, { steps: +(process.env.STEPS || 8) }); moves += +(process.env.STEPS || 8); if (process.env.PAUSE) await new Promise(r => setTimeout(r, +process.env.PAUSE));
  if (Date.now() - lastSnap >= 1000) {
    lastSnap = Date.now(); const s = await snap(); const dt = (s.t - prev.t) / 1000;
    const r = { buf_new: (s.g.buf_new - prev.g.buf_new) / dt, destroyed: (s.g.buf_destroyed - prev.g.buf_destroyed) / dt, live: s.g.buf, submits: s.p.submits, passes: s.p.passes, fps: s.p.dt_avg_ms ? 1000 / s.p.dt_avg_ms : 0, bg_new: (s.g.bg_new - prev.g.bg_new) / dt, view_new: (s.g.view_new - prev.g.view_new) / dt, lag: s.g.lag_ms };
    maxLive = Math.max(maxLive, s.g.buf || 0); rows.push(r); prev = s;
    console.log(`DRAGROW bg_new/s=${r.bg_new.toFixed(0)} view_new/s=${r.view_new.toFixed(0)} submit_lag_ms=${r.lag} buf_new/s=${r.buf_new.toFixed(0)} destroyed/s=${r.destroyed.toFixed(0)} live=${r.live} submits=${r.submits} passes=${r.passes} fps=${r.fps.toFixed(0)} frame=${s.p.frame} ms=${s.p.dt_avg_ms && s.p.dt_avg_ms.toFixed(0)} max=${s.p.dt_max_ms && s.p.dt_max_ms.toFixed(0)}`);
  }
}
const sN = await snap(); console.log("PERFEND " + JSON.stringify(sN.p)); const tot = (sN.t - s0.t) / 1000;
const keys = Object.keys(sN.g).filter(k => /tex.*new|new/.test(k));
console.log(`DRAGH1 bg_new/s=${((sN.g.bg_new - s0.g.bg_new) / tot).toFixed(0)} view_new/s=${((sN.g.view_new - s0.g.view_new) / tot).toFixed(0)} submit_lag_max_ms=${sN.g.lag_max}`);
{ const hs = []; for (const k of Object.keys(sN.g.hist || {})) hs.push([k, ((sN.g.hist[k] - ((s0.g.hist || {})[k] || 0)) / tot), ((sN.g.hbytes[k] - ((s0.g.hbytes || {})[k] || 0)) / tot / 1024)]);
  hs.sort((a, b) => b[1] - a[1]); console.log("DRAGHIST " + hs.slice(0, 12).map(h => `${h[0]}=${h[1].toFixed(0)}/s(${h[2].toFixed(0)}KB/s)`).join("  ")); }
console.log(`DRAGSUM dur=${tot.toFixed(1)}s mouse_moves=${moves} buf_new/s=${((sN.g.buf_new - s0.g.buf_new) / tot).toFixed(0)} max_live=${maxLive} new_keys=${keys.join(",")} tex_new/s=${sN.g.tex_new !== undefined ? ((sN.g.tex_new - s0.g.tex_new) / tot).toFixed(1) : "n/a"} gpumem=${JSON.stringify({ ...sN.g, hist: undefined, hbytes: undefined })}`);
await page.screenshot({ path: "drag_end.png" }).catch(() => {});
await page.keyboard.press("Escape");
await new Promise(r => setTimeout(r, 1500));
console.log(lost ? "FAIL drag (GPU lost)" : "PASS drag");
await browser.close();
