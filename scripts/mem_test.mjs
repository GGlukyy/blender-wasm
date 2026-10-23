// M1: baseline paměti s limity iPad Safari. Kroky řízené Python timerem; po každém kroku se zapíše __PERF__.
// node mem_test.mjs [idle_s]   -> tabulka "MEMROW step heap_mb tex tex_mb imm_kb fps"
const { chromium } = await import(process.env.PW || "playwright");
const IDLE = +(process.argv[2] || 60);
const expr = `import bpy, sys
S = {'i': -1, 'wait': 0}
def sh(t):
    for a in bpy.context.screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = t
def step(n):
    c = bpy.context
    ob = c.view_layer.objects.active
    if n == 1:
        c.window.workspace = bpy.data.workspaces['UV Editing']; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    elif n == 2:
        bpy.ops.object.mode_set(mode='OBJECT'); c.window.workspace = bpy.data.workspaces['Layout']; sh('MATERIAL')
    elif n == 3:
        sh('SOLID'); m = ob.modifiers.new('s', 'SUBSURF'); m.levels = 2; bpy.ops.object.mode_set(mode='SCULPT')
    elif n == 4:
        bpy.ops.object.mode_set(mode='OBJECT'); bpy.ops.mesh.primitive_monkey_add(); o = c.view_layer.objects.active; m = o.modifiers.new('s', 'SUBSURF'); m.levels = 3
HOLD = [${IDLE}, 15, 20, 20, 20]
def _t():
    if S['wait'] > 0:
        S['wait'] -= 1; return 1.0
    S['i'] += 1
    if S['i'] > 0 and S['i'] <= 4: step(S['i'])
    print('MEMSTEP', S['i']); sys.stdout.flush()
    if S['i'] >= len(HOLD): return None
    S['wait'] = HOLD[S['i']]
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300))); page.on("crash", () => console.log("PAGECRASH"));
let step = -1; const rows = [];
const names = ["idle", "uv_edit", "material_preview", "sculpt_subsurf2", "monkey_subsurf3"];
page.on("console", m => { const t = m.text(); const r = /MEMSTEP (\d+)/.exec(t); if (r) { snap().then(() => { step = +r[1]; }); } if (/WEBGPU_LOST/.test(t)) console.log("LOST", t.slice(0, 200)); });
const peak = { heap: 0, tex_mb: 0 };
async function snap() {
  const [p, g] = await page.evaluate(() => [window.__PERF__ || null, window.__GPUMEM__ || null]);
  if (step >= 0 && names[step] && p && g) rows.push({ step: names[step], heap: Math.round(p.heap_mb), tex_mb: g.tex_mb, buf: g.buf, buf_mb: g.buf_mb, new: g.buf_new, destroyed: g.buf_destroyed, gc: g.buf_gc, fps: Math.round(1000 / p.dt_avg_ms) });
}
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; window.__CAPENV = { WGPU_CAP_MAX_BUFFER: "268435456", WGPU_CAP_MAX_SSBO: "134217728" }; }, expr);
await page.goto("http://localhost:5173/?perf=1&tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
// drobný pohyb myši = překreslování (jako prst); přerušeno, když se skript dokončí
const end = Date.now() + (IDLE + 15 + 20 + 20 + 20 + 30) * 1000;
let n = 0;
while (Date.now() < end && step < 4) { await page.mouse.move(600 + (n++ % 2) * 40, 400); await new Promise(r => setTimeout(r, 500)); }
await new Promise(r => setTimeout(r, 22000)); await snap();
console.log("step              heap_mb tex_mb(js) bufs buf_mb buf_new destroyed gc fps");
for (const r of rows) console.log(`MEMROW ${r.step.padEnd(17)} ${r.heap} ${r.tex_mb} ${r.buf} ${r.buf_mb} ${r.new} ${r.destroyed} ${r.gc} ${r.fps}`);
console.log(rows.length >= 4 ? "PASS mem baseline" : "FAIL mem baseline");
await browser.close();
