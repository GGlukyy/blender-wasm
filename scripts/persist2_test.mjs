// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, os
st = {'n': 0, 'phase': None}
P = '/opfs/home/persist_${Date.now()}.blend'
def _t():
    try:
        st['n'] += 1
        if st['phase'] is None:
            st['phase'] = 'load' if os.path.exists(P) else 'save'
        if st['phase'] == 'save' and st['n'] == 2:
            ob = bpy.context.scene.objects['Cube']
            m = ob.modifiers.new('Sub', 'SUBSURF'); m.levels = 2
            mat = bpy.data.materials.new('RedMat'); mat.diffuse_color = (1, 0, 0, 1); ob.data.materials.append(mat)
            ob.location = (1.5, 0, 0); ob.name = 'PersistCube'
            bpy.ops.wm.save_as_mainfile(filepath=P)
            print('VPC', 'saved', st['n'], os.path.getsize(P), 0, 0, 0, 0, 0)
        elif st['phase'] == 'load' and st['n'] == 2:
            bpy.ops.wm.open_mainfile(filepath=P)
        elif st['phase'] == 'load' and st['n'] > 2:
            ob = bpy.context.scene.objects.get('PersistCube')
            ok = int(bool(ob and ob.modifiers and ob.modifiers[0].levels == 2 and any(s.material and s.material.name == 'RedMat' for s in ob.material_slots) and abs(ob.location.x - 1.5) < 1e-4))
            print('VPC', 'loaded', st['n'], ok, ob.name if ob else None, [m.levels for m in ob.modifiers] if ob else None, [s.material.name if s.material else None for s in ob.material_slots] if ob else None, ob.location.x if ob else None, [o.name for o in bpy.context.scene.objects])
        sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=5.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null;
const ring = [];
let dbg = false; page.on("pageerror", e => { console.log("LAST_DRAWS\n" + ring.join("\n")); console.log("PAGEERROR", String(e.stack || e).slice(0,600)); }); page.on("crash", () => console.log("PAGECRASH"));
page.on("console", (m) => { const t = m.text(); if (t.startsWith("DRAWLOG") || t.startsWith("[err] DRAWLOG")) { ring.push(t); if (ring.length > 14) ring.shift(); }
  if (dbg && !/DRAWLOG/.test(t) && /ssert|abort|Abort|error|Error/.test(t) && !/OpenImageIO|PNG|multiproc/.test(t)) console.log("DBG", t.slice(0,1200)); if (dbg && !/WGPU|VPC|PASSLOG/.test(t)) console.log("DBG", t.slice(0, 220)); const i = t.indexOf("VPC "); if (i >= 0) { console.log("V", t.slice(i, i + 80)); if (/ERR|SAVED/.test(t)) console.log("RAW", t.slice(0, 300)); last = t.slice(i + 4).trim().split(/\s+/); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const exported = new Map();
if (process.env.SEEDOUT) await page.addInitScript(() => { window.__CAPENV = { WGPU_WGSL_EXPORT: "1" }; });
page.on("console", (m) => { const t = m.text(); if (dbg && /DRAWLOG|ssert|abort|Abort|error|Error/.test(t) && !/OpenImageIO|PNG|multiproc/.test(t)) console.log("DBG", t.slice(0,1200)); if (t.startsWith("WGSL_EXPORT ")) { const [k, v] = JSON.parse(t.slice(12)); exported.set(k, v); } });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
dbg = true; await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 576, y: box.y + 396 };
await wait(15000);
console.log("PHASE1", last.join(" "));
const saved = last[0] === "saved" && +last[2] > 1000;
await page.reload({ waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click().catch(() => {});
last = null;
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await wait(25000);
console.log("PHASE2", last && last.join(" "));
const ok = saved && last && last[0] === "loaded" && last[2] === "1";
console.log("FINAL", last && last.join(" "));
console.log(ok ? "PASS: .blend uložený do /opfs přežil reload stránky (modifikátor, materiál, pozice)" : "FAIL: saved=" + saved + " phase2=" + (last && last.join(" ")));
await page.screenshot({ path: "out/persist.png" });
await browser.close();
