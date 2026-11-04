// H25b-a: klik myší na kost v Pose módu vybere TU kost? (web Blender, Windows Chrome)
// Python timer postaví armaturu s 5 kostmi (známé pozice, čelní ortho pohled), vypíše pixelové středy kostí (BPOS)
// a po každém kliku stav (BPROBE active + vybrané). Test klikne na každou kost 2× v různém pořadí.
const { chromium } = await import(process.env.PW || "playwright");
const HAND = process.env.VIEW === 'hand';
const EDIT = process.env.MODE === 'edit';
const expr = `HAND = ${HAND ? 1 : 0}
EDIT = ${EDIT ? 1 : 0}
import bpy, sys, mathutils
from bpy_extras import view3d_utils
st = {'built': False}
def build():
    for o in list(bpy.data.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    try:
        bpy.ops.preferences.addon_enable(module='rigify')
    except Exception as e: print('PY addon ' + str(e))
    bpy.ops.object.armature_human_metarig_add()
    ob = bpy.context.object
    ob.show_in_front = True
    if EDIT:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.armature.select_all(action='DESELECT')
    else:
        bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='DESELECT')
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r3 = a.spaces[0].region_3d; r3.view_perspective = 'ORTHO'
            r3.view_rotation = mathutils.Euler((1.5707963, 0, 0)).to_quaternion(); r3.view_location = (tuple(ob.matrix_world @ ob.pose.bones['hand.L'].head) if HAND else (0, 0, 0.9)); r3.view_distance = (0.45 if HAND else 3.2)
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
            import math
            segs = []
            for pb in ob.pose.bones:
                h = view3d_utils.location_3d_to_region_2d(reg, rv, ob.matrix_world @ pb.head); t = view3d_utils.location_3d_to_region_2d(reg, rv, ob.matrix_world @ pb.tail)
                segs.append((pb.name, h, t))
            def dseg(p, h, t):
                dx, dy = t.x - h.x, t.y - h.y; l2 = dx*dx + dy*dy
                u = 0 if l2 < 1e-9 else max(0, min(1, ((p.x-h.x)*dx + (p.y-h.y)*dy) / l2))
                return math.hypot(p.x - (h.x+u*dx), p.y - (h.y+u*dy))
            amb = []
            for pb in ob.pose.bones:
                mid = view3d_utils.location_3d_to_region_2d(reg, rv, ob.matrix_world @ ((pb.head + pb.tail) * 0.5))
                if any(n != pb.name and dseg(mid, h, t) < 6 for n, h, t in segs): amb.append(pb.name)
            print('BAMB ' + ' '.join(amb)); sys.stdout.flush()
            print('BSEG ' + ' '.join('%s:%.1f:%.1f:%.1f:%.1f' % (n, reg.x + h.x, W.height - (reg.y + h.y), reg.x + t.x, W.height - (reg.y + t.y)) for n, h, t in segs)); sys.stdout.flush()
            print('BPOS ' + ' '.join(pts) + ' WIN %d %d' % (W.width, W.height)); sys.stdout.flush()
    if EDIT:
        sel = [b.name for b in ob.data.edit_bones if b.select or b.select_head or b.select_tail]
        act = ob.data.edit_bones.active.name if ob.data.edit_bones.active else 'None'
    else:
        sel = [pb.name for pb in ob.pose.bones if (pb.select if hasattr(pb, 'select') else pb.bone.select)]
        act = ob.data.bones.active.name if ob.data.bones.active else 'None'
    print('BPROBE mode=%s active=%s sel=%s' % (ob.mode, act, ','.join(sel))); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let probe = "", bpos = "", errors = 0, amb = [], bseg = "";
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("BSEG")) >= 0) bseg = t.slice(i + 5).trim();
  else if ((i = t.indexOf("BAMB")) >= 0) amb = t.slice(i + 5).trim().split(" ");
  else if ((i = t.indexOf("BPROBE")) >= 0) probe = t.slice(i + 7); else if ((i = t.indexOf("BPOS")) >= 0) bpos = t.slice(i + 5);
  else if (/Traceback|Error:|File "/.test(t)) console.log("PY " + t.slice(0, 200));
  else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
if (process.env.SELDBG) await page.addInitScript(() => { window.__CAPENV = { SELDBG: "1" }; });
page.on("console", (m) => { const t = m.text(); if (process.env.ALLLOG && !/WGPU|WGSL|OVR_|COMPILELOG|BPOS|timedWait/.test(t)) console.log("LOG " + t.slice(0, 160)); });
page.on("console", (m) => { if (process.env.SELDBG && m.text().includes("SELDBG")) console.log(m.text().slice(0, 120)); });
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

const segs = {}; for (const t of bseg.split(" ")) { const p = t.split(":"); if (p.length === 5) segs[p[0]] = p.slice(1).map(Number); }
const [mx, my] = pos["hand.L"]; const R = +process.env.BOXR || 160;
const x0 = box.x + (mx - R) * sx, y0 = box.y + (my - R) * sy, x1 = box.x + (mx + R) * sx, y1 = box.y + (my + R) * sy;
const inside = (x, y) => x >= mx - R && x <= mx + R && y >= my - R && y <= my + R;
const mustIn = Object.keys(segs).filter((n) => inside(segs[n][0], segs[n][1]) && inside(segs[n][2], segs[n][3]));
const mustOut = Object.keys(segs).filter((n) => [0, 2].every((k) => Math.max(Math.abs(segs[n][k] - mx), Math.abs(segs[n][k + 1] - my)) > R + 25) && !(Math.min(segs[n][0], segs[n][2]) <= mx + R && Math.max(segs[n][0], segs[n][2]) >= mx - R && Math.min(segs[n][1], segs[n][3]) <= my + R && Math.max(segs[n][1], segs[n][3]) >= my - R));
await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 6 }); await page.mouse.move(x1, y1, { steps: 6 }); await page.mouse.up(); await wait(1500);
const sel = ((/sel=(\S*)/.exec(probe) || [])[1] || "").split(",").filter(Boolean);
const miss = mustIn.filter((n) => !sel.includes(n)), extra = mustOut.filter((n) => sel.includes(n));
console.log(`BOX mustIn=${mustIn.length} selected=${sel.length} missing=${miss.length} ${miss.slice(0, 5)} falsePositives(far)=${extra.length} ${extra.slice(0, 5)}`);
await page.screenshot({ path: "out/bone_box.png" });
const ok = mustIn.length > 3 && miss.length === 0 && extra.length === 0 && errors === 0;
console.log(ok ? "PASS box" : "FAIL box");
await browser.close(); process.exit(ok ? 0 : 1);
