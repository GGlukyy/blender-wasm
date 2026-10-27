// A: vlastní add-on přežije reload (OPFS). Fáze 1: nainstaluj .zip; fáze 2 (nový start, stejný profil): add-on je v seznamu a jde zapnout.
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import path from "node:path";
const { chromium } = await import(process.env.PW || "playwright");
const prof = mkdtempSync(path.join(tmpdir(), "bprof-"));
const P1 = `import bpy, sys, zipfile, os
def go():
    os.makedirs('/tmp/at', exist_ok=True)
    src = 'bl_info = {"name": "Persist Test", "blender": (4, 2, 0), "category": "Object"}\\nimport bpy\\ndef register(): pass\\ndef unregister(): pass\\n'
    with zipfile.ZipFile('/tmp/at/ltpers.zip', 'w') as z: z.writestr('ltpers/__init__.py', src)
    print('PERSIST1', bpy.ops.preferences.addon_install(filepath='/tmp/at/ltpers.zip', overwrite=True)); sys.stdout.flush()
    print('PERSIST1_DONE'); sys.stdout.flush(); return None
bpy.app.timers.register(go, first_interval=6.0)`;
const P2 = `import bpy, sys, os, addon_utils
def go():
    d = bpy.utils.user_resource('SCRIPTS', path='addons')
    ex = os.path.exists(os.path.join(d, 'ltpers', '__init__.py'))
    addon_utils.modules_refresh()
    en = bpy.ops.preferences.addon_enable(module='ltpers') if ex else None
    print('PERSIST2 exists=%s enable=%s' % (ex, en)); sys.stdout.flush(); return None
bpy.app.timers.register(go, first_interval=8.0)`;
async function run(expr, marker) {
  const ctx = await chromium.launchPersistentContext(prof, { headless: false, executablePath: process.env.CHROME,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"], viewport: { width: 1400, height: 850 } });
  const page = ctx.pages()[0] || await ctx.newPage(); let res = "";
  page.on("console", (m) => { const t = m.text(); if (t.includes(marker)) res += t + "\n"; });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 90 && !res.includes(marker === "PERSIST1" ? "PERSIST1_DONE" : "PERSIST2 "); i++) await new Promise(r => setTimeout(r, 1000));
  await new Promise(r => setTimeout(r, 3000)); await ctx.close(); return res;
}
const r1 = await run(P1, "PERSIST1"); console.log(r1.trim());
const r2 = await run(P2, "PERSIST2"); console.log(r2.trim());
const ok = /exists=True enable=\{'FINISHED'\}/.test(r2);
console.log((ok ? "PASS" : "FAIL") + " addon_persist");
process.exit(0);
