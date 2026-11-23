// H53: paměť wasm při přehrávání soft body (hustý mesh). Env Q=query, FRAMES (výchozí 120), VERTS (ico subdivisions, výchozí 5).
// Výstup: řádky SB <snímek> used_mb heap_mb; na konci SBSUM.
const { chromium } = await import(process.env.PW || "playwright");
const FRAMES = +(process.env.FRAMES || 120), SUBD = +(process.env.SUBD || 5), EXTRA = process.env.SBEXTRA || "";
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    try:
        if st['n'] == 1:
            bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
            bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0)); bpy.ops.rigidbody.object_add() if False else None
            pl = bpy.context.object; bpy.ops.object.modifier_add(type='COLLISION')
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=${SUBD}, radius=1, location=(0, 0, 3))
            o = bpy.context.object; bpy.ops.object.modifier_add(type='SOFT_BODY')
            o.modifiers['Softbody'].settings.use_goal = False
            bpy.context.scene.frame_end = ${FRAMES} + 10
            ${EXTRA}
            print('SB setup verts', len(o.data.vertices)); bpy.context.scene.frame_set(1)
        elif st['n'] > 2 and st['n'] - 2 <= ${FRAMES}:
            bpy.context.scene.frame_set(st['n'] - 2)
            if (st['n'] - 2) % 20 == 0: print('SB_FRAME', st['n'] - 2)
    except Exception as e: print('SB ERR', e)
    sys.stdout.flush()
    return 0.15 if st['n'] - 2 < ${FRAMES} else None
bpy.app.timers.register(_t, first_interval=8.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = 0, verts = 0, err = null; const rows = [];
page.on("console", async m => { const t = m.text(); const r = /SB_FRAME (\d+)/.exec(t); if (/SB ERR/.test(t)) err = t; const v = /SB setup verts (\d+)/.exec(t); if (v) verts = +v[1];
  if (r) { last = +r[1]; const h = await page.evaluate(() => window.__MEMHUD__ || null).catch(() => null); rows.push([last, h && h.used]); console.log("SB", last, "used_mb", h && h.used); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?memhud=1&autosave=600&" + (process.env.Q || ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 400 && last < FRAMES && !err; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 3000));
const used = rows.map(r => r[1]).filter(x => x != null);
console.log("SBSUM verts=" + verts + " frames=" + last + " first_used=" + used[0] + " last_used=" + used[used.length - 1] + " err=" + err);
await browser.close();
