// Preferences přežijí reload: 1. běh změní ui_scale a počká na uložení, 2. běh (stejný profil → OPFS) ho musí mít načtený.
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const { chromium } = await import(process.env.PW || "playwright");
const dir = mkdtempSync(join(tmpdir(), "prefprof-"));
async function run(expr, tag) {
  const ctx = await chromium.launchPersistentContext(dir, { headless: false, executablePath: process.env.CHROME, viewport: { width: 1400, height: 850 }, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
  const page = ctx.pages()[0] || await ctx.newPage();
  let res = null; page.on("console", m => { const t = m.text(); const i = t.indexOf("PREF "); if (i >= 0) res = t.slice(i); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300 && !res?.includes("DONE"); i++) await new Promise(r => setTimeout(r, 1000));
  await new Promise(r => setTimeout(r, 1500)); await ctx.close(); return res;
}
const set = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    if st['n'] == 1:
        import addon_utils; addon_utils.enable('node_wrangler', default_set=True, persistent=True)
        bpy.context.preferences.view.ui_scale = 1.25
    if st['n'] == 25: print('PREF DONE set', bpy.context.preferences.view.ui_scale); sys.stdout.flush(); return None
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0, persistent=True)`;
const get = `import bpy, sys
def _t():
    import sys as _s; print('PREF DONE get', bpy.context.preferences.view.ui_scale, 'nw', 'node_wrangler' in bpy.context.preferences.addons, 'node_wrangler' in _s.modules or any('node_wrangler' in k for k in _s.modules)); sys.stdout.flush()
bpy.app.timers.register(_t, first_interval=6.0, persistent=True)`;
const a = await run(set, "set"); console.log("run1:", a);
const b = await run(get, "get"); console.log("run2:", b);
console.log(b && b.includes("get 1.25") && b.includes("nw True True") ? "PASS prefs přežily reload" : "FAIL prefs se neuložily/nenačetly");
