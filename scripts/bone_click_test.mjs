// H25b-a: klik myší na kost v Pose módu vybere TU kost? (web Blender, Windows Chrome)
// Python timer postaví armaturu s 5 kostmi (známé pozice, čelní ortho pohled), vypíše pixelové středy kostí (BPOS)
// a po každém kliku stav (BPROBE active + vybrané). Test klikne na každou kost 2× v různém pořadí.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, mathutils
from bpy_extras import view3d_utils
st = {'built': False}
def build():
    for o in list(bpy.data.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.armature_add(location=(0, 0, 0))
    ob = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ob.data.edit_bones
    for b in list(eb): eb.remove(b)
    for i in range(5):
        b = eb.new('B%d' % i); b.head = (-2.4 + i * 1.2, 0, -0.8 + (i % 2) * 0.6); b.tail = (b.head.x + 0.3, 0, b.head.z + 1.2)
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='DESELECT')
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r3 = a.spaces[0].region_3d; r3.view_perspective = 'ORTHO'
            r3.view_rotation = mathutils.Euler((1.5707963, 0, 0)).to_quaternion(); r3.view_location = (0, 0, 0); r3.view_distance = 9
            a.spaces[0].overlay.show_bones = True
    st['built'] = True
def probe():
    if not st['built']:
        build(); return 1.0
    ob = bpy.context.view_layer.objects.active
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            reg = [r for r in a.regions if r.type == 'WINDOW'][0]; rv = a.spaces[0].region_3d
            W = bpy.context.window_manager.windows[0]
            pts = []
            for pb in ob.pose.bones:
                mid = ob.matrix_world @ ((pb.head + pb.tail) * 0.5)
                p = view3d_utils.location_3d_to_region_2d(reg, rv, mid)
                pts.append('%s:%.1f:%.1f' % (pb.name, reg.x + p.x, W.height - (reg.y + p.y)))
            print('BPOS ' + ' '.join(pts) + ' WIN %d %d' % (W.width, W.height)); sys.stdout.flush()
    sel = [pb.name for pb in ob.pose.bones if (pb.select if hasattr(pb, 'select') else pb.bone.select)]
    act = ob.data.bones.active.name if ob.data.bones.active else 'None'
    print('BPROBE mode=%s active=%s sel=%s' % (ob.mode, act, ','.join(sel))); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let probe = "", bpos = "", errors = 0;
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("BPROBE")) >= 0) probe = t.slice(i + 7); else if ((i = t.indexOf("BPOS")) >= 0) bpos = t.slice(i + 5);
  else if (/Traceback|Error:|File "/.test(t)) console.log("PY " + t.slice(0, 200));
  else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const m = /WIN (\d+) (\d+)/.exec(bpos); const sx = m ? box.width / +m[1] : 1, sy = m ? box.height / +m[2] : 1;
const pos = {}; for (const t of bpos.split(" ")) { const p = t.split(":"); if (p.length === 3) pos[p[0]] = [+p[1], +p[2]]; }
console.log("BPOS", bpos, "scale", sx.toFixed(2), sy.toFixed(2));
await page.mouse.move(box.x + 400, box.y + 300); await wait(500);
let hit = 0, total = 0;
const order = ["B2", "B0", "B4", "B1", "B3", "B3", "B0", "B2", "B4", "B1"];
for (const n of order) {
  const [x, y] = pos[n]; if (x === undefined) continue;
  await page.mouse.click(box.x + x * sx, box.y + y * sy); await wait(1000);
  const a = /active=(\S+)/.exec(probe), s = /sel=(\S*)/.exec(probe);
  const ok = a && a[1] === n && s && s[1] === n; total++; if (ok) hit++;
  console.log(`${ok ? "PASS" : "FAIL"} click ${n} -> active=${a && a[1]} sel=${s && s[1]}`);
}
await page.screenshot({ path: "out/bone_click.png" });
console.log(`RESULT ${hit}/${total} shod errors=${errors}`);
await browser.close();
process.exit(hit === total && errors === 0 ? 0 : 1);
