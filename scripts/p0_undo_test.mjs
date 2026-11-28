// P0.5: undo paměť. Kostka subdiv 5 (aplikovaný), 20 editací v Edit Mode (každá = undo krok), malloc (MEMHUD used) po krocích; pak 3× undo → vrcholy zpět?
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const lines = []; page.on("console", (m) => { const t = m.text(); if (/UNDOT/.test(t)) { lines.push(t); console.log(t); } });
const PY = `import bpy
st = {'i': -1}
def ctx():
    w = bpy.context.window_manager.windows[0]
    a = next(a for a in w.screen.areas if a.type == 'VIEW_3D')
    return dict(window=w, screen=w.screen, area=a, region=next(r for r in a.regions if r.type == 'WINDOW'))
def tick():
    i = st['i']; st['i'] += 1
    try:
        p = bpy.context.preferences.edit
        if i == -1:
            print('UNDOT prefs steps=%d limit=%d' % (p.undo_steps, p.undo_memory_limit), flush=True)
            for o in list(bpy.data.objects): bpy.data.objects.remove(o)
            bpy.ops.mesh.primitive_cube_add()
            o = bpy.context.active_object; m = o.modifiers.new('s', 'SUBSURF'); m.levels = int('${process.env.LV || 5}')
            bpy.ops.object.modifier_apply(modifier='s')
            print('UNDOT verts %d' % len(o.data.vertices), flush=True)
            with bpy.context.temp_override(**ctx()):
                bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
            return 1.0
        if i < 20:
            with bpy.context.temp_override(**ctx()):
                if '${process.env.OP || ""}' == 'topo':
                    (bpy.ops.mesh.quads_convert_to_tris if i % 2 == 0 else bpy.ops.mesh.tris_convert_to_quads)()
                bpy.ops.transform.translate(value=(0.01, 0, 0)); bpy.ops.ed.undo_push(message='t%d' % i)
            print('UNDOT step %d' % i, flush=True); return 0.7
        if i == 20:
            with bpy.context.temp_override(**ctx()):
                bpy.ops.object.mode_set(mode='OBJECT')
            st['x0'] = bpy.context.active_object.data.vertices[0].co.x
            with bpy.context.temp_override(**ctx()):
                for _ in range(4): bpy.ops.ed.undo()
            ob = bpy.context.active_object
            if ob.mode == 'EDIT':
                with bpy.context.temp_override(**ctx()): bpy.ops.object.mode_set(mode='OBJECT')
            x1 = bpy.context.active_object.data.vertices[0].co.x
            print('UNDOT undo x0=%.3f x1=%.3f dx=%.3f' % (st['x0'], x1, st['x0'] - x1), flush=True)
            print('UNDOT done', flush=True); return None
    except Exception as e:
        print('UNDOT ERR', i, repr(e), flush=True); return None
bpy.app.timers.register(tick, first_interval=6.0)`;
await page.addInitScript((a) => { window.__BARGS = a; }, ["--python-expr", PY]);
const q = "?tel=1&memhud=1" + (process.env.Q ? "&" + process.env.Q : "");
await page.goto("http://localhost:5173/" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
const L = page.getByRole("button", { name: /Launch Blender/ });
for (let i = 0; i < 120 && !(await L.isEnabled().catch(() => false)); i++) await wait(1000);
await L.click();
let last = 0;
for (let i = 0; i < 400 && !lines.some(l => /UNDOT (done|ERR)/.test(l)); i++) {
  await wait(1000); const h = await page.evaluate(() => window.__MEMHUD__ || null);
  const st = lines.filter(l => /UNDOT step/.test(l)).length;
  if (h && st !== last) { console.log("UNDOT mem steps=" + st + " used=" + h.used); last = st; }
}
await wait(3000); const h = await page.evaluate(() => window.__MEMHUD__ || null); console.log("UNDOT mem_final used=" + (h && h.used));
await browser.close();
