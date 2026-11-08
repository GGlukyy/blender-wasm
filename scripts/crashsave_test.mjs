// B3-POJISTKA: karta spadne 1 s po přepnutí na Material Preview (arg "shading") nebo na jiný workspace (arg "workspace"),
// dřív než stihne 30s autosave. Běh 1: přidá kouli, přepne, CDP Page.crash. Běh 2 (stejný profil/OPFS): koule je v _autosave_prev.blend.
const { chromium } = await import(process.env.PW || "playwright");
const os = await import("os"), fs = await import("fs"), path = await import("path");
const mode = process.argv[2] || "shading", q = process.env.Q ? "&" + process.env.Q : "";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crashsave-"));
const run = async (expr, until, label, crash) => {

  const ctx = await chromium.launchPersistentContext(dir, { headless: false, executablePath: process.env.CHROME, viewport: { width: 1400, height: 850 }, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = ctx.pages()[0] || await ctx.newPage();
  let done = false; const out = [];
  page.on("console", m => { const t = m.text(); if (/CS |AUTOSAVE|RESTORE/.test(t)) { console.log(label, t.slice(0, 160)); out.push(t); if (until.test(t)) done = true; } });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/?tel=0" + q, { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 1500 && !done; i++) await new Promise(r => setTimeout(r, 100));
  if (crash) {
    await new Promise(r => setTimeout(r, 1000));
    await page.goto("chrome://crash", { timeout: 5000 }).catch(() => {}); /* renderer spadne jako Jetsam: bez pagehide/unload */
    console.log(label, "crashed");
  }
  await Promise.race([ctx.close(), new Promise(r => setTimeout(r, 15000))]);
  return { done, out };
};
const sw = mode === "workspace" ? "bpy.context.window.workspace = bpy.data.workspaces['Shading' if 'Shading' in bpy.data.workspaces else 'Sculpting']"
  : "[setattr(a.spaces[0].shading, 'type', 'MATERIAL') for a in bpy.context.window.screen.areas if a.type == 'VIEW_3D']";
const e1 = `import bpy
def _a():
    bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.context.object.name = 'CrashSph'; bpy.ops.ed.undo_push(message='x')
    return None
def _b():
    ${sw}
    print('CS switched ${mode}', flush=True)
    return None
bpy.app.timers.register(_a, first_interval=5.0, persistent=True)
bpy.app.timers.register(_b, first_interval=7.0, persistent=True)`;
const r1 = await run(e1, /CS switched/, "run1", true);
const e2 = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    if st['n'] == 6:
        try:
            bpy.ops.wm.open_mainfile(filepath='/opfs/home/_autosave_prev.blend')
            print('CS objects', [o.name for o in bpy.data.objects], flush=True)
        except Exception as e: print('CS ERR', e, flush=True)
        return None
    return 1.0
bpy.app.timers.register(_t, first_interval=6.0, persistent=True)`;
const r2 = await run(e2, /CS (objects|ERR)/, "run2", false);
const ok = r1.done && r2.out.some(t => /RESTORE_OFFER \d+/.test(t)) && r2.out.some(t => /CS objects.*CrashSph/.test(t));
console.log(ok ? `PASS crashsave ${mode}` : `FAIL crashsave ${mode} switched=${r1.done} offer=${r2.out.some(t => /RESTORE_OFFER \d+/.test(t))}`);
