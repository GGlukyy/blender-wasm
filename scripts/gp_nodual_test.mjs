// H26-B: GP kompozice bez dual-source blendu == s ním. node gp_nodual_test.mjs <0|1>  (1 = ?nodualsrc=1)
// Výstup: out/gp_nodual_<mode>.png + řádek GPS (počet nenulových/ne-pozadí pixelů uvnitř canvasu se nepočítá tady).
const { chromium } = await import(process.env.PW || "playwright");
const mode = process.argv[2] || "0";
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    try:
        st['n'] += 1
        if st['n'] == 1:
            bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
            bpy.ops.object.grease_pencil_add(type='STROKE')
            w = bpy.context.window_manager.windows[0]
            area = [a for a in w.screen.areas if a.type == 'VIEW_3D'][0]
            reg = [r for r in area.regions if r.type == 'WINDOW'][0]
            with bpy.context.temp_override(window=w, area=area, region=reg):
                bpy.ops.view3d.view_axis(type='FRONT')
                bpy.ops.view3d.view_selected()
            print('GPS READY')
        sys.stdout.flush()
    except Exception as e: print('GPS ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let ready = false, err = 0; const used = new Set();
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300)));
page.on("console", (m) => { const t = m.text(); if (t.includes("GPS READY")) ready = true; { const m2 = /WGPU_BATCH pipeline created shader='(gpencil_antialiasing_stage_2\w*)'/.exec(t); if (m2) used.add(m2[1]); } if (/GPS ERR|PIPE_THROW|WGPU_PIPE/.test(t)) { err++; console.log("RAW", t.slice(0, 300)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?nodualsrc=" + mode, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(18000);
await page.keyboard.press("Escape"); await wait(2500);
await page.locator("#canvas").screenshot({ path: `out/gp_nodual_${mode}.png` });
await page.mouse.move(600, 400); for (const k of ["KP_4", "KP_4", "KP_8"]) { await page.keyboard.press("Numpad" + k.slice(3)); await wait(400); }
await wait(1500); await page.locator("#canvas").screenshot({ path: `out/gp_nodual_${mode}_orbit.png` });
console.log("SHADERS", [...used].join(","), mode === "1" ? (used.has("gpencil_antialiasing_stage_2_nodual") && !used.has("gpencil_antialiasing_stage_2") ? "PASS nodual použit" : "FAIL") : (used.has("gpencil_antialiasing_stage_2") && !used.has("gpencil_antialiasing_stage_2_nodual") ? "PASS dual použit" : "FAIL"));
console.log(ready ? "READY" : "NOT READY", "errs=" + err);
await browser.close();
