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
page.on("console", m => { const t = m.text(); if (/DRAGREADY/.test(t)) ready = true; if (/WEBGPU_LOST/.test(t)) { lost = true; console.log("LOST", t.slice(0, 200)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?perf=1&tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 3000));
const snap = () => page.evaluate(() => ({ g: window.__GPUMEM__ || {}, p: window.__PERF__ || {}, t: performance.now() }));
await page.mouse.move(700, 400); await new Promise(r => setTimeout(r, 500));
await page.keyboard.press("g");
await new Promise(r => setTimeout(r, 500));
const s0 = await snap(); let prev = s0, maxLive = 0, moves = 0;
const rows = [];
const end = Date.now() + DUR * 1000; let lastSnap = Date.now(), a = 0;
while (Date.now() < end) {
  a += 0.9; // prudké pohyby přes celé okno (jako prst)
  await page.mouse.move(700 + Math.cos(a) * 450, 400 + Math.sin(a * 1.3) * 300, { steps: 8 }); moves += 8;
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
await page.keyboard.press("Escape");
await new Promise(r => setTimeout(r, 1500));
console.log(lost ? "FAIL drag (GPU lost)" : "PASS drag");
await browser.close();
