// R1a (auto):  po "pádu" (zavření tabu) nabídne Blender při dalším startu obnovení posledního autosave.
// Běh 1: přidá kouli, počká na AUTOSAVE, zavře. Běh 2 (stejný profil/OPFS): čeká na RESTORE_OFFER, otevře soubor, ověří kouli.
const { chromium } = await import(process.env.PW || "playwright");
const os = await import("os"), fs = await import("fs"), path = await import("path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "restore-"));
const run = async (expr, until, label, shot, extra = 0) => {
  const ctx = await chromium.launchPersistentContext(dir, { headless: false, executablePath: process.env.CHROME, viewport: { width: 1400, height: 850 }, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = ctx.pages()[0] || await ctx.newPage();
  let done = false, out = [];
  page.on("console", m => { const t = m.text(); if (/RST|AUTOSAVE|RESTORE|WEB_RESTORED/.test(t)) { console.log(label, t.slice(0, 160)); out.push(t); if (until.test(t)) done = true; if (shot && /WEB_RESTORED \d+/.test(t)) setTimeout(() => page.screenshot({ path: shot }).catch(() => {}), 1000); } });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/?autosave=5&tel=0" + ((label === "run2" || label === "run3") && process.env.R2Q ? "&" + process.env.R2Q : ""), { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 150 && !done; i++) await new Promise(r => setTimeout(r, 1000));
  if (extra) await new Promise(r => setTimeout(r, extra));
  if (label === "run3") { const banner = await page.evaluate(() => !!document.getElementById("restore-crashed-note")).catch(() => false);
    console.log("run3 banner:", banner, "restoreAuto:", out.some(t => /RESTORE_AUTO \d+/.test(t)), "flag:", await page.evaluate(() => localStorage.getItem("restoring")).catch(() => "?"));
    await page.screenshot({ path: "out/restore_crashed.png" }).catch(() => {}); await ctx.close();
    return banner && !out.some(t => /RESTORE_AUTO \d+/.test(t)) && !out.some(t => /WEB_RESTORED/.test(t)); }
  await ctx.close();
  return done && (label === "run1" || !out.some(t => /RESTORE.*ERR/.test(t)) && out.some(t => /RESTORE_AUTO \d+/.test(t)) && out.some(t => /WEB_RESTORED \d+/.test(t)) && out.some(t => /RST objects.*RestSph/.test(t)));
};
const e1 = `import bpy
def _a():
    bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.context.object.name = 'RestSph'; bpy.ops.ed.undo_push(message='x')
bpy.app.timers.register(_a, first_interval=6.0, persistent=True)`;
const ok1 = await run(e1, /WGPU_FIRST_CONTENT/, "run1", null, 30000);
const e2 = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    if st['n'] == 8:
        print('RST objects', [o.name for o in bpy.data.objects]); sys.stdout.flush(); return None
    return 1.0
bpy.app.timers.register(_t, first_interval=9.0, persistent=True)`;
process.env.R2Q = "restore=auto";
const ok2 = await run(e2, /RST (objects|ERR)/, "run2", "out/restore_auto.png", 1500);
/* O1c: run2 skončil dřív než za 60 s po RESTORE_AUTO = "pád" → run3 (bez ?restore) nesmí autosave otevřít sám, jen nabídnout lištou */
process.env.R2Q = "";
const ok3 = await run(e2, /RESTORE_CRASHED_OFFER/, "run3", null, 12000);
console.log(ok1 && ok2 && ok3 ? "PASS restore_auto" : `FAIL restore_auto ok1=${ok1} ok2=${ok2} ok3=${ok3}`);
