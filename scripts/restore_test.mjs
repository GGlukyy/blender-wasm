// K5: po "pádu" (zavření tabu) nabídne Blender při dalším startu obnovení posledního autosave.
// Běh 1: přidá kouli, počká na AUTOSAVE, zavře. Běh 2 (stejný profil/OPFS): čeká na RESTORE_OFFER, otevře soubor, ověří kouli.
const { chromium } = await import(process.env.PW || "playwright");
const os = await import("os"), fs = await import("fs"), path = await import("path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "restore-"));
const run = async (expr, until, label, shot, extra = 0) => {
  const ctx = await chromium.launchPersistentContext(dir, { headless: false, executablePath: process.env.CHROME, viewport: { width: 1400, height: 850 }, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = ctx.pages()[0] || await ctx.newPage();
  let done = false, out = [];
  page.on("console", m => { const t = m.text(); if (/RST|AUTOSAVE|RESTORE/.test(t)) { console.log(label, t.slice(0, 160)); out.push(t); if (until.test(t)) done = true; if (shot && /RESTORE_OFFER \d+/.test(t)) setTimeout(() => page.screenshot({ path: shot }).catch(() => {}), 1000); } });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/?autosave=5&tel=0", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 150 && !done; i++) await new Promise(r => setTimeout(r, 1000));
  if (extra) await new Promise(r => setTimeout(r, extra));
  await ctx.close();
  return done && (label === "run1" || !out.some(t => /RESTORE.*ERR/.test(t)) && out.some(t => /RESTORE_OFFER \d+/.test(t)) && out.some(t => /RST objects.*RestSph/.test(t)));
};
const e1 = `import bpy
def _a():
    bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.context.object.name = 'RestSph'; bpy.ops.ed.undo_push(message='x')
bpy.app.timers.register(_a, first_interval=6.0, persistent=True)`;
const ok1 = await run(e1, /WGPU_FIRST_CONTENT/, "run1", null, 30000);
const e2 = `import bpy, os, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    if st['n'] == 8:
        try:
            bpy.ops.wm.open_mainfile(filepath='/opfs/home/_autosave_prev.blend')
            print('RST objects', [o.name for o in bpy.data.objects]); sys.stdout.flush()
        except Exception as e: print('RST ERR', e)
        return None
    return 1.0
bpy.app.timers.register(_t, first_interval=8.0, persistent=True)`;
let seen = false;
const ok2 = await run(e2, /RST (objects|ERR)/, "run2", "out/restore_offer.png");
console.log(ok1 && ok2 ? "PASS restore (kontrola: out/restore_offer.png ukazuje popup?)" : `FAIL restore ok1=${ok1} ok2=${ok2}`);
