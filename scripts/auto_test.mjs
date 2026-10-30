// A1a: ověří, že `?auto=<scénář>` v demo/src/autotest.js hýbe Blenderem (syntetické události / bpy) a pošle auto_done.
// node auto_test.mjs <light|lightdrag|orbit|mp>  -> PASS když přijde AUTO_DONE/auto_done a sonda ukáže změnu (světlo/pohled).
const { chromium } = await import(process.env.PW || "playwright");
const scen = process.argv[2] || "lightdrag";
const probe = `import bpy, sys
def snap(tag):
    L = bpy.data.objects.get('Light'); loc = tuple(round(v, 3) for v in L.location) if L else None
    r = None
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': r = tuple(round(v, 3) for v in a.spaces[0].region_3d.view_matrix[0])
    print('PROBE ' + tag + ' loc=' + str(loc) + ' view=' + str(r)); sys.stdout.flush()
    return None
import os
_st = {'b': False, 'a': False}
def _watch():
    if os.path.exists('/tmp/auto_go') and not _st['b']: _st['b'] = True; snap('before')
    if os.path.exists('/tmp/auto_probe') and not _st['a']: _st['a'] = True; snap('after'); return None
    return 0.5
bpy.app.timers.register(_watch, first_interval=0.5)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const probes = {}; let errors = 0, done = false; const steps = [];
page.on("console", (m) => { const t = m.text(); const p = /^PROBE (\w+) loc=(.*) view=(.*)$/.exec(t); if (p) probes[p[1]] = { loc: p[2], view: p[3] };
  if (t.startsWith("AUTO_")) { steps.push(t); if (t.startsWith("AUTO_DONE")) done = true; }
  if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, probe);
await page.goto(`http://localhost:5173/?auto=${scen}&tel=1${process.env.MP === "0" ? "" : "&mp=1"}`, { waitUntil: "load" });
if (!process.env.NOAUTOCLICK) {} // Launch klikne stránka sama (A1: ?auto=)
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
for (let i = 0; i < 300 && !(await page.evaluate(() => window.__AUTO_DONE)); i++) await new Promise(r => setTimeout(r, 1000));
done = !!(await page.evaluate(() => window.__AUTO_DONE));
await page.evaluate(() => Module.FS.writeFile('/tmp/auto_probe', '1'));
for (let i = 0; i < 90 && !probes.after; i++) await new Promise(r => setTimeout(r, 1000));   // sonda 'after'
await page.screenshot({ path: `out/auto_${scen}.png` });
console.log("STEPS", steps.join(" | ")); console.log("PROBES", JSON.stringify(probes));
const changed = probes.before && probes.after && (probes.before.loc !== probes.after.loc || probes.before.view !== probes.after.view);
const ok = done && (scen === "mp" || changed) && errors === 0;
console.log((ok ? "PASS" : "FAIL") + ` auto=${scen} done=${done} changed=${!!changed} errors=${errors}`);
await browser.close(); process.exit(ok ? 0 : 1);
