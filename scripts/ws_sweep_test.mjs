// P1: WGSL seed. Windows Chrome (skutečná GPU) proti dev serveru :5173.
//   node wgsl_seed_win.mjs seed    -> projde viewport/edit mode/všechny workspaces, uloží out/wgsl-cache.json
//   node wgsl_seed_win.mjs verify  -> totéž s načteným seedem (SEED=out/wgsl-cache.json přes /wgsl-cache.json), spočítá cache-miss
// Cache-miss = volání globalThis.__WGSL_CACHE_PUT__ (shader se musel přeložit GLSL->SPIR-V->WGSL).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const mode = process.argv[2] || "seed";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR: " + e.message));
// Blender běží na pthread workeru → cache hooky ze stránky nevidí; počítáme řádky z konzole:
//   WGSL_MISS <key> (překlad proběhl), WGSL_EXPORT [key,wgsl] (jen při WGPU_WGSL_EXPORT=1)
const exported = new Map(); let nmiss = 0; let seedLine = "";
const uncs = new Map(); page.on("console", (m) => { { const t0 = m.text(); if (/UNCAPTURED|shaderc FAIL|translate FAILED|tint-write FAIL/.test(t0)) { const k = t0.replace(/[0-9]+/g, "#").slice(0, 200); if (!uncs.has(k)) { uncs.set(k, 1); console.log("UNC " + t0.slice(0, 400)); } } }
  const t = m.text();
  if (t.startsWith("WGSL_EXPORT ")) { const [k, v] = JSON.parse(t.slice(12)); exported.set(k, v); nmiss++; }
  else if (t.startsWith("WGSL_MISS ")) nmiss++;
  else if (t.startsWith("WGSL seed")) seedLine = t;
});
if (mode === "seed") await page.addInitScript(() => { window.__CAPENV = { WGPU_WGSL_EXPORT: "1" }; });
// Python příkazový timer: JS zapíše název režimu do /tmp/seedcmd (Module.FS), Blender ho provede.
const PYCMD = `import bpy, os
def _c():
    p = '/tmp/seedcmd'
    try:
        if os.path.exists(p):
            m = open(p).read().strip(); os.remove(p)
            w = bpy.context.window_manager.windows[0]
            area = [a for a in w.screen.areas if a.type == 'VIEW_3D'][0]
            reg = [r for r in area.regions if r.type == 'WINDOW'][0]
            with bpy.context.temp_override(window=w, area=area, region=reg):
                if m == 'tpaint':
                    bpy.ops.object.mode_set(mode='TEXTURE_PAINT')
                    bpy.ops.paint.add_texture_paint_slot(type='BASE_COLOR', slot_type='IMAGE', name='seedtp', width=64, height=64, color=(1, 1, 1, 1), alpha=False)
                elif m == 'wpaint':
                    ob = bpy.context.view_layer.objects.active
                    if not ob.vertex_groups: ob.vertex_groups.new(name='g')
                    bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
                else:
                    bpy.ops.object.mode_set(mode=m)
    except Exception as e:
        print('seedcmd error', e)
    return 0.5
bpy.app.timers.register(_c, first_interval=2.0)`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, PYCMD);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) {
  if ((await page.evaluate(() => window.__BGUI__ || {})).window) break;
  await new Promise(r => setTimeout(r, 1000));
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(6000);
const box = await page.locator("#canvas").boundingBox();
const vp = { x: box.x + 600, y: box.y + 400 };
const misses = async () => nmiss;
const phases = [];
const i0 = (x) => (x === 1111 || x === 1092 ? 12000 : 2500);   // material/rendered kompilují EEVEE
const phase = async (name, fn) => { const a = await misses(); await fn(); await wait(1500); const b = await misses(); phases.push([name, b - a]); console.log(`phase ${name}: ${b - a} translations`); };
await page.mouse.move(vp.x, vp.y);
await phase("boot", async () => {});
await phase("orbit/pan/zoom", async () => {
  await page.mouse.down({ button: "middle" }); await page.mouse.move(vp.x + 120, vp.y + 40, { steps: 10 }); await page.mouse.up({ button: "middle" });
  await page.keyboard.down("Shift"); await page.mouse.down({ button: "middle" }); await page.mouse.move(vp.x + 60, vp.y - 30, { steps: 8 });
  await page.mouse.up({ button: "middle" }); await page.keyboard.up("Shift");
  await page.mouse.wheel(0, -2); await wait(800);
  await page.mouse.click(vp.x, vp.y); await page.keyboard.press("g");
  await page.mouse.move(vp.x + 60, vp.y, { steps: 6 }); await page.keyboard.press("Escape");
});
await phase("edit mode v/e/f", async () => {
  await page.keyboard.press("Tab"); await wait(3000);
  for (const k of ["1", "2", "3"]) { await page.keyboard.press(k); await wait(800); await page.keyboard.press("a"); await wait(800); }
  await page.keyboard.press("Alt+a"); await page.keyboard.press("Tab"); await wait(1500);
});
await phase("shading modes", async () => {   // tlačítka v hlavičce viewportu: wire, solid, material, rendered
  for (const x of [1054, 1092, 1111, 1073]) { await page.mouse.click(box.x + x, box.y + 38); await wait(i0(x)); }
  await page.mouse.move(vp.x, vp.y);
});
for (let i = 0; i < 11; i++) {
  await phase(`workspace ${i + 1}`, async () => {
    await page.keyboard.down("Control"); await page.keyboard.press("PageDown"); await page.keyboard.up("Control");
    await wait(i === 5 ? 15000 : 4500);
  });
}
// Properties editor: všechny záložky (materiál = náhledové koule EEVEE, fyzika, modifikátory, ...)
await phase("properties tabs", async () => {
  for (const y of [222, 258, 286, 314, 342, 370, 406, 442, 470, 498, 526, 554, 582, 610]) {
    await page.mouse.click(box.x + 1167, box.y + y); await wait(y === 610 ? 15000 : 2500);
  }
  await page.mouse.click(box.x + 1167, box.y + 442); await wait(1500);
});
// režimy: sculpt, vertex/weight/texture paint, edit, zpět do object
const cmd = async (m, ms) => { await page.evaluate((m) => window.Module.FS.writeFile("/tmp/seedcmd", m), m); await wait(ms); await page.mouse.move(vp.x, vp.y); };
await page.mouse.click(vp.x, vp.y);
for (const [m, ms] of [["SCULPT", 12000], ["VERTEX_PAINT", 10000], ["wpaint", 10000], ["tpaint", 12000], ["EDIT", 5000], ["OBJECT", 4000]]) {
  await phase(`mode ${m}`, async () => { await cmd(m, ms); });
}
const total = await misses();
console.log(`TOTAL translations: ${total}; ${seedLine || "seed not loaded"}`);
writeFileSync(`out/wgsl_${mode}_phases.json`, JSON.stringify(phases));
if (mode === "seed") {
  const entries = JSON.stringify([...exported.entries()]);
  writeFileSync("out/wgsl-cache.json", entries);
  console.log(`SEED entries=${JSON.parse(entries).length} bytes=${entries.length}`);
}
await page.screenshot({ path: `out/wgsl_${mode}_end.png` });
await browser.close();
