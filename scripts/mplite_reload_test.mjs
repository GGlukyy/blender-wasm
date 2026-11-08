// B3k: EEVEE lite (iPad, ?ipad=1) musí platit i po File ▸ New a po otevření .blend (ne jen po startu).
// Výstup ML0..3 = use_shadows,taa_samples,use_raytracing po startu / po read_homefile / po otevření souboru se stíny / po uložení: musí být lite.
// ML6 = is_dirty 3 s po uložení (musí být False). ML4/ML5 = co je v uloženém souboru (save, save copy): musí být původní hodnoty (stíny, 16 vzorků).
const { chromium } = await import(process.env.PW || "playwright");
const q = process.env.Q || "webkit_sim=1&ipad=1&pool=4";
const expr = `import bpy, sys
from bpy.app.handlers import persistent
def st(tag):
    e = bpy.context.scene.eevee
    print('ML%s shadows=%s taa=%d rt=%s' % (tag, e.use_shadows, e.taa_samples, e.use_raytracing), flush=True)
def a():
    st('0'); bpy.ops.wm.read_homefile(); return None
def b():
    st('1'); sc = bpy.context.scene; sc.eevee.use_shadows = True; sc.eevee.taa_samples = 16
    bpy.ops.wm.save_as_mainfile(filepath='/tmp/ml_shadows.blend'); bpy.ops.wm.open_mainfile(filepath='/tmp/ml_shadows.blend'); return None
def c():
    st('2'); bpy.ops.wm.save_as_mainfile(filepath='/tmp/ml_shadows.blend'); st('3'); bpy.ops.wm.save_as_mainfile(filepath='/tmp/ml_copy.blend', copy=True); return None
def d():
  print('ML6 dirty=%s' % bpy.data.is_dirty, flush=True)
  try:
    # soubor uložený na iPadu musí mít původní hodnoty (stíny, 16 vzorků), ne lite
    bpy.ops.wm.read_homefile()
    with bpy.data.libraries.load('/tmp/ml_shadows.blend') as (src, dst): dst.scenes = src.scenes
    e = dst.scenes[0].eevee; print('ML4 saved shadows=%s taa=%d' % (e.use_shadows, e.taa_samples), flush=True)
    with bpy.data.libraries.load('/tmp/ml_copy.blend') as (src, dst): dst.scenes = src.scenes
    e = dst.scenes[0].eevee; print('ML5 saved shadows=%s taa=%d' % (e.use_shadows, e.taa_samples), flush=True)
  except Exception as ex: print('ML5 ERR', ex, flush=True)
  return None
bpy.app.timers.register(a, first_interval=8.0, persistent=True)
bpy.app.timers.register(b, first_interval=12.0, persistent=True)
bpy.app.timers.register(c, first_interval=16.0, persistent=True)
bpy.app.timers.register(d, first_interval=19.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const res = {};
page.on("console", (m) => { const t = m.text(); const r = t.match(/^ML(\d) (.*)/); if (r) { res[r[1]] = r[2]; console.log(t); } if (/MPLITE_EEVEE/.test(t)) console.log(t.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?tel=0&" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 1800 && !res["5"]; i++) await new Promise(r => setTimeout(r, 100));
const lite = (s) => /shadows=False taa=1 rt=False/.test(s || "");
const orig = (s) => /saved shadows=True taa=16/.test(s || "");
console.log(["0", "1", "2", "3"].every(k => lite(res[k])) && orig(res["4"]) && orig(res["5"]) && res["6"] === "dirty=False" ? "PASS mplite_reload" : `FAIL mplite_reload ${JSON.stringify(res)}`);
await browser.close();
