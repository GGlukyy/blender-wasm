// Vlastní autosave (demo/src/main.js): po změně scény se do ~10 s objeví /opfs/home/_autosave.blend a jde otevřít. ?autosave=10
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, os, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    try:
        if st['n'] == 1:
            bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.context.object.name = 'AutoSph'; bpy.ops.ed.undo_push(message='x')
            print('AST added dirty', bpy.data.is_dirty)
        p = '/opfs/home/_autosave.blend'
        if st['n'] == 30:
            ok = os.path.exists(p)
            print('AST exists', ok, os.path.getsize(p) if ok else 0)
            if ok:
                with bpy.data.libraries.load(p) as (a, b): names = list(a.objects)
                print('AST objects', names, 'PASS' if 'AutoSph' in names else 'FAIL')
            else: print('AST FAIL')
    except Exception as e: print('AST ERR', e)
    sys.stdout.flush()
    return 1.0 if st['n'] < 31 else None
bpy.app.timers.register(_t, first_interval=8.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let done = false; page.on("console", m => { const t = m.text(); if (/AST|AUTOSAVE/.test(t)) { console.log(t.slice(0, 200)); if (/AST (objects|FAIL)/.test(t)) done = true; } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?autosave=10", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 120 && !done; i++) await new Promise(r => setTimeout(r, 1000));
if (!done) console.log("AST TIMEOUT FAIL");
await browser.close();
