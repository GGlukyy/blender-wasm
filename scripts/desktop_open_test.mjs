// .blend uložený DESKTOP Blenderem 5.2 (bohatá scéna) se otevře ve web buildu a vyhodnotí na stejné počty. node desktop_open_test.mjs
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
const b64 = readFileSync("desktop_scene.blend").toString("base64");
const exp = readFileSync("desktop_scene.json", "utf8");
const expr = `
import bpy, base64, sys, json
open('/tmp/d.blend','wb').write(base64.b64decode('${b64}'))
EXP = json.loads('''${exp}''')
def go():
    try:
        bpy.ops.wm.open_mainfile(filepath='/tmp/d.blend')
        dg = bpy.context.evaluated_depsgraph_get()
        got = {'objects': len(bpy.data.objects), 'eval': {}}
        for ob in bpy.data.objects:
            if ob.type in ('MESH', 'FONT', 'CURVE'):
                ev = ob.evaluated_get(dg); me = ev.to_mesh(); got['eval'][ob.name] = len(me.vertices); ev.to_mesh_clear()
        got['shape_keys'] = len(bpy.data.objects['shapes'].data.shape_keys.key_blocks)
        got['cprop'] = bpy.data.objects['mods']['cprop']
        c = bpy.data.objects['anim']; a = c.animation_data.action
        got['fcurves'] = sum(1 for _ in a.layers[0].strips[0].channelbags[0].fcurves) if hasattr(a, 'layers') else len(a.fcurves)
        bpy.context.scene.frame_set(20); got['anim_z'] = round(bpy.data.objects['anim'].location.z, 3)
        ok = all(got[k] == EXP[k] for k in ('objects', 'eval', 'shape_keys', 'cprop', 'fcurves')) and abs(got['anim_z'] - 4) < 0.01
        print('DOPEN', 'PASS' if ok else 'FAIL', json.dumps(got), 'expected', json.dumps({k: EXP[k] for k in ('objects', 'eval', 'shape_keys', 'cprop', 'fcurves')}))
    except Exception as e:
        print('DOPEN FAIL EXC', e)
    sys.stdout.flush(); return None
bpy.app.timers.register(go, first_interval=6.0)
`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let res = null, errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 160)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("DOPEN"); if (i >= 0) res = t.slice(i); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 120 && !res; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 4000));
await page.locator("#canvas").screenshot({ path: "out/desktop_open.png" }).catch(() => {});
console.log(res);
console.log(res && res.includes("DOPEN PASS") && errs === 0 ? "PASS: desktop .blend" : "FAIL: desktop .blend");
await browser.close();
