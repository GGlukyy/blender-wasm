// H25d-a: vygenerovaný Rigify rig: klik na tvar kontrolky, klik na neviditelnou osu kontrolky, klik do prázdna.
// Očekávání (desktop, Lukáš 3b): tvar vybere kost, 30 px od všeho nevybere nic. MODE: pose.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `MESHBG = ${process.env.MESH ? 1 : 0}
import bpy, sys, json, math, mathutils
from bpy_extras import view3d_utils
st = {'built': False, 'out': False}
def build():
    for o in list(bpy.data.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    bpy.ops.preferences.addon_enable(module='rigify')
    bpy.ops.object.armature_human_metarig_add()
    meta = bpy.context.object
    bpy.ops.pose.rigify_generate()
    ob = bpy.context.view_layer.objects.active
    ob.show_in_front = True
    ob.data.display_type = 'OCTAHEDRAL'
    meta.hide_set(True)
    me = bpy.data.meshes.new('WGT_box')
    me.from_pydata([(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)], [], [(0,1,2,3),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    wb = bpy.data.objects.new('WGT_box', me)
    em = bpy.data.objects.new('WGT_empty', None); em.empty_display_type = 'CUBE'; em.empty_display_size = 1.0
    for w in (wb, em):
        w.hide_viewport = False
        bpy.context.scene.collection.objects.link(w); w.hide_set(True)
    if MESHBG:
        # Postava: skoro žádné pixely, ale AABB přes celý rig (desktop tam nic nevybere).
        bm = bpy.data.meshes.new('body')
        bm.from_pydata([(-1.2,0,0),(-1.15,0,0),(-1.2,0,0.05),(1.2,0,2.2),(1.15,0,2.2),(1.2,0,2.15)], [], [(0,1,2),(3,4,5)])
        bo = bpy.data.objects.new('body', bm); bpy.context.scene.collection.objects.link(bo)
    bpy.ops.object.mode_set(mode='EDIT')
    tb = ob.data.edit_bones.new('ctl_test'); tb.head = (1.0, 0, 1.5); tb.tail = (1.0, 0, 1.9)
    bpy.ops.object.mode_set(mode='POSE')
    bT = ob.pose.bones['ctl_test']; bT.custom_shape = wb; bT.use_custom_shape_bone_size = False; bT.custom_shape_scale_xyz = (0.04, 0.04, 0.04); bT.custom_shape_translation = (0, 0.7, 0)
    fm = bpy.data.meshes.new('WGT_far'); fm.from_pydata([(0.95,0,0),(1.05,0,0),(1,0,0.1)], [(0,1),(1,2),(2,0)], [])
    fo = bpy.data.objects.new('WGT_far', fm); bpy.context.scene.collection.objects.link(fo); fo.hide_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    tb = ob.data.edit_bones.new('ctl_big'); tb.head = (-1.0, 0, 0.2); tb.tail = (-1.0, 0, 0.5)
    bpy.ops.object.mode_set(mode='POSE')
    bB = ob.pose.bones['ctl_big']; bB.custom_shape = fo; bB.use_custom_shape_bone_size = False; bB.custom_shape_scale_xyz = (0.6, 0.6, 0.6)
    bL = ob.pose.bones['foot_ik.L']; bL.custom_shape = wb; bL.bone.show_wire = False; bL.use_custom_shape_bone_size = False; bL.custom_shape_scale_xyz = (0.2, 0.2, 0.2); bL.custom_shape_translation = (0, 0.6, 0)
    bR = ob.pose.bones['foot_ik.R']; bR.custom_shape = em; bR.bone.show_wire = False; bR.use_custom_shape_bone_size = False; bR.custom_shape_scale_xyz = (0.2, 0.2, 0.2); bR.custom_shape_translation = (0, 0.6, 0)
    bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='DESELECT')
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r3 = a.spaces[0].region_3d; r3.view_perspective = 'ORTHO'
            r3.view_rotation = mathutils.Euler((1.5707963, 0, 0)).to_quaternion(); r3.view_location = (0, 0, 0.9); r3.view_distance = 2.8
            a.spaces[0].overlay.show_bones = True
    st['built'] = True
def dump(ob):
    W = bpy.context.window_manager.windows[0]
    for a in W.screen.areas:
        if a.type != 'VIEW_3D': continue
        reg = [r for r in a.regions if r.type == 'WINDOW'][0]; rv = a.spaces[0].region_3d
        def px(co):
            p = view3d_utils.location_3d_to_region_2d(reg, rv, co)
            return None if p is None else [reg.x + p.x, W.height - (reg.y + p.y)]
        res = {}
        for pb in ob.pose.bones:
            if pb.bone.hide or (pb.bone.collections and not any(c.is_visible_effectively for c in pb.bone.collections)): continue
            cs = pb.custom_shape
            e = {'axis': px(ob.matrix_world @ ((pb.head + pb.tail) * 0.5)), 'head': px(ob.matrix_world @ pb.head), 'tail': px(ob.matrix_world @ pb.tail), 'shape': []}
            if cs is not None and cs.type == 'MESH':
                sc = pb.custom_shape_scale_xyz * (pb.length if pb.use_custom_shape_bone_size else 1.0)
                mat = pb.custom_shape_transform.matrix if pb.custom_shape_transform else pb.matrix
                loc = mathutils.Matrix.Translation(pb.custom_shape_translation); rot = pb.custom_shape_rotation_euler.to_matrix().to_4x4()
                m = ob.matrix_world @ mat @ loc @ rot @ mathutils.Matrix.Diagonal((*sc, 1))
                for ed in cs.data.edges:
                    q = px(m @ cs.data.vertices[ed.vertices[0]].co); r = px(m @ cs.data.vertices[ed.vertices[1]].co)
                    if q and r: e['shape'].append(q + r)
            if cs is not None and cs.type == 'EMPTY':
                sc = pb.custom_shape_scale_xyz * (pb.length if pb.use_custom_shape_bone_size else 1.0)
                mat = pb.custom_shape_transform.matrix if pb.custom_shape_transform else pb.matrix
                m = ob.matrix_world @ mat @ mathutils.Matrix.Translation(pb.custom_shape_translation) @ mathutils.Matrix.Diagonal((*sc, 1))
                c = [mathutils.Vector((x, y, z)) * cs.empty_display_size for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
                for i in range(8):
                    for j in range(i + 1, 8):
                        if (c[i] - c[j]).length < 2.01 * cs.empty_display_size:
                            q = px(m @ c[i]); r = px(m @ c[j])
                            if q and r: e['shape'].append(q + r)
            if pb.name == 'ctl_big': e['disp'] = px(ob.matrix_world @ pb.matrix @ mathutils.Vector((0, 0.5, 0)))
            res[pb.name] = e
        print('BDUMP ' + json.dumps({'win': [W.width, W.height], 'bones': res}, separators=(',', ':'))); sys.stdout.flush()
def probe():
    if not st['built']:
        build(); return 1.0
    ob = bpy.context.view_layer.objects.active
    if not st['out']:
        st['out'] = True; dump(ob)
    sel = [pb.name for pb in ob.pose.bones if pb.select] if hasattr(ob.pose.bones[0], 'select') else [pb.name for pb in ob.pose.bones if pb.bone.select]
    print('BPROBE seq=%d sel=%s' % (st.setdefault('n', 0), ','.join(sel))); st['n'] += 1; sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let probe = "", dump = null, errors = 0;
const chunks = [];
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("BDUMP ")) >= 0) dump = t.slice(i + 6);
  else if ((i = t.indexOf("BPROBE ")) >= 0) probe = t.slice(i + 7);
  else if (/Traceback|Error:|File "/.test(t)) console.log("PY " + t.slice(0, 220));
  else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
for (let i = 0; i < 180 && !dump; i++) await wait(1000);
await wait(5000);
await page.keyboard.press("Escape"); await wait(800);
if (!dump) { console.log("FAIL: bez BDUMP"); await browser.close(); process.exit(1); }
const D = JSON.parse(dump); const box = await page.locator("#canvas").boundingBox();
const sx = box.width / D.win[0], sy = box.height / D.win[1];
await page.mouse.move(box.x + 300, box.y + 300); await wait(400);
const inView = (p) => p && p[0] > 240 && p[0] < 1150 && p[1] > 70 && p[1] < 780;
const click = async (p) => { await page.mouse.click(box.x + p[0] * sx, box.y + p[1] * sy); await wait(900); const s = /sel=(\S*)/.exec(probe); return s ? s[1] : ""; };
const dSeg = (p, s) => { const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy; const u = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / l2)); return Math.hypot(p[0] - s[0] - u * dx, p[1] - s[1] - u * dy); };
/* Vše viditelné: u kosti s tvarem jeho hrany, jinak osa. */
const vis = {}; for (const [n, b] of Object.entries(D.bones)) vis[n] = b.shape.length ? b.shape : (b.head && b.tail ? [[...b.head, ...b.tail]] : []);
const nearest = (p, skip) => { let best = 1e9, who = ""; for (const [n, ss] of Object.entries(vis)) for (const s of ss) { const d = dSeg(p, s); if (d < best && n !== skip) { best = d; who = n; } } return [best, who]; };
const ctl = Object.entries(D.bones).filter(([n, b]) => b.shape.length).map(([n]) => n);
console.log(`bones=${Object.keys(D.bones).length} custom_shape=${ctl.length}`);
let fail = 0; const check = (ok, l) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${l}`); };
/* A: klik na hranu tvaru, kde je do 14 px jen tahle kontrolka. */
const shapePts = []; for (const n of ctl) { for (const s of D.bones[n].shape) { const p = [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]; if (!inView(p)) continue; if (nearest(p, n)[0] > 16) { shapePts.push([n, p]); break; } } }
for (const [n, p] of shapePts.slice(0, 8)) { const s = await click(p); check(s.split(",").includes(n), `tvar ${n} @${p.map(Math.round)} -> ${s || "(nic)"}`); }
console.log(`shape_clicks=${shapePts.length}`);
/* B: klik na neviditelnou osu kontrolky, daleko od každého viditelného tvaru: desktop nevybere nic. */
const axisPts = []; for (const n of ctl) { const { head: h, tail: t } = D.bones[n]; if (!h || !t) continue; for (let k = 1; k < 10; k++) { const p = [h[0] + (t[0] - h[0]) * k / 10, h[1] + (t[1] - h[1]) * k / 10]; if (inView(p) && nearest(p)[0] > 16) { axisPts.push([n, p]); break; } } }
await click([300, 120]);
for (const [n, p] of axisPts.slice(0, 8)) { const s = await click(p); check(!s, `osa ${n} @${p.map(Math.round)} -> ${s || "(nic)"}`); }
console.log(`axis_clicks=${axisPts.length}`); check(axisPts.length > 0, "aspoň 1 klik na osu");
/* E: klik doprostřed tvaru (střed disp_mat), kde nic nakreslené není: desktop nevybere nic. */
{ const pts = []; for (const n of ctl) { const ss = D.bones[n].shape; if (ss.length < 8) continue; const xs = ss.flatMap((q) => [q[0], q[2]]), ys = ss.flatMap((q) => [q[1], q[3]]); const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; if (inView(c) && nearest(c)[0] > 16) pts.push([n, c]); }
  console.log(`center_clicks=${pts.length}`);
  for (const [n, p] of pts.slice(0, 8)) { const s = await click(p); check(!s, `střed ${n} @${p.map(Math.round)} -> ${s || "(nic)"}`); } }
/* F: velký tvar: neviditelná osa disp_mat (Y × scale) míří do prázdna; desktop tam nic nevybere. */
{ const p = D.bones.ctl_big.disp; const d = nearest(p)[0]; console.log("ctl_big disp", p.map(Math.round), "nejbližší viditelné", Math.round(d)); const s = await click(p); check(d > 16 && !s, `osa velkého tvaru @${p.map(Math.round)} -> ${s || "(nic)"}`); }
/* D: klik na plochu plného boxu (mimo jeho hrany a mimo vše ostatní) a na hranu Empty kostky. */
{ const n = "foot_ik.L", ss = D.bones[n].shape, xs = ss.flatMap((q) => [q[0], q[2]]), ys = ss.flatMap((q) => [q[1], q[3]]); let pt = null;
  for (let x = Math.min(...xs); x < Math.max(...xs) && !pt; x += 3) for (let y = Math.min(...ys); y < Math.max(...ys) && !pt; y += 3) { const p = [x, y]; if (nearest(p)[0] > 16) pt = p; }
  check(!!pt, "plný box má volné místo"); if (pt) { const s = await click(pt); check(s.split(",").includes(n), `plný box ${n} @${pt.map(Math.round)} -> ${s || "(nic)"}`); await click([300, 120]); } }
{ const n = "foot_ik.R"; let pt = null; for (const q of D.bones[n].shape) { const p = [(q[0] + q[2]) / 2, (q[1] + q[3]) / 2]; if (nearest(p, n)[0] > 16) { pt = p; break; } }
  check(!!pt, "Empty má volnou hranu"); if (pt) { const s = await click(pt); check(s.split(",").includes(n), `Empty ${n} @${pt.map(Math.round)} -> ${s || "(nic)"}`); await click([300, 120]); } }
/* C: 10 kliků 22-40 px od všeho viditelného: nic. */
const miss = []; for (let y = 90; y < 770 && miss.length < 40; y += 37) for (let x = 300; x < 1100; x += 41) { const d = nearest([x, y])[0]; if (d > 22 && d < 40) miss.push([x, y]); }
const step = Math.max(1, Math.floor(miss.length / 10));
for (let i = 0; i < miss.length && i < step * 10; i += step) { const s = await click(miss[i]); check(!s, `vedle @${miss[i]} -> ${s || "(nic)"}`); }
await page.screenshot({ path: "out/bone_miss.png" });
console.log(`RESULT fail=${fail} errors=${errors}`);
await browser.close();
process.exit(fail === 0 && errors === 0 ? 0 : 1);
