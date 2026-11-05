// H25d: B-Bone se vybírá podle nakreslené křivky, Stick podle úsečky; mimo tvar nic. node bone_bbone_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, json, mathutils
from bpy_extras import view3d_utils
st = {'built': False, 'out': False, 'n': 0}
def build():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    arm = bpy.data.armatures.new('A'); ob = bpy.data.objects.new('A', arm)
    bpy.context.scene.collection.objects.link(ob); bpy.context.view_layer.objects.active = ob; ob.select_set(True); ob.show_in_front = True
    arm.display_type = TYPE
    bpy.ops.object.mode_set(mode='EDIT')
    b = arm.edit_bones.new('bb'); b.head = (-1, 0, 0); b.tail = (1, 0, 0); b.bbone_segments = 16
    bpy.ops.object.mode_set(mode='POSE')
    pb = ob.pose.bones['bb']
    if TYPE == 'BBONE': pb.bbone_curveinz = 1.2; pb.bbone_curveoutz = -1.2
    bpy.ops.pose.select_all(action='DESELECT')
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r3 = a.spaces[0].region_3d; r3.view_perspective = 'ORTHO'
            r3.view_rotation = mathutils.Euler((1.5707963, 0, 0)).to_quaternion(); r3.view_location = (0, 0, 0); r3.view_distance = 4
    st['built'] = True
def probe():
    if not st['built']:
        build(); return 1.0
    ob = bpy.context.view_layer.objects.active; pb = ob.pose.bones['bb']
    if not st['out']:
        st['out'] = True
        bpy.context.view_layer.update()
        W = bpy.context.window_manager.windows[0]
        for a in W.screen.areas:
            if a.type != 'VIEW_3D': continue
            reg = [r for r in a.regions if r.type == 'WINDOW'][0]; rv = a.spaces[0].region_3d
            px = lambda co: (lambda p: [reg.x + p.x, W.height - (reg.y + p.y)])(view3d_utils.location_3d_to_region_2d(reg, rv, co))
            mid = ob.matrix_world @ ((pb.head + pb.tail) * 0.5)
            curve = [px(ob.matrix_world @ pb.matrix @ (pb.bone.bbone_segment_matrix(i, rest=False) if False else pb.bbone_segment_matrix(i, rest=False)).to_translation()) for i in range(16)] if pb.bone.bbone_segments > 1 else []
            print('BDUMP ' + json.dumps({'win': [W.width, W.height], 'mid': px(mid), 'head': px(ob.matrix_world @ pb.head), 'tail': px(ob.matrix_world @ pb.tail), 'curve': curve})); sys.stdout.flush()
    print('BPROBE sel=%s' % ('bb' if pb.select else '')); sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0; const check = (ok, l) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${l}`); };
for (const TYPE of (process.env.TYPES || "BBONE,STICK").split(",")) {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  let probe = "", dump = null;
  page.on("console", (m) => { const t = m.text(); let i; if ((i = t.indexOf("BDUMP ")) >= 0) dump = t.slice(i + 6); else if ((i = t.indexOf("BPROBE ")) >= 0) probe = t.slice(i + 7); else if (/Traceback|Error:/.test(t) && !/_multiprocessing/.test(t)) console.log("PY " + t.slice(0, 200)); });
  page.on("pageerror", (e) => { fail++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, `TYPE = '${TYPE}'\n` + expr);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 120 && !dump; i++) await wait(1000);
  await wait(4000); await page.keyboard.press("Escape"); await wait(600);
  if (!dump) { check(false, TYPE + " bez BDUMP"); await page.context().close(); continue; }
  const D = JSON.parse(dump), box = await page.locator("#canvas").boundingBox(), sx = box.width / D.win[0], sy = box.height / D.win[1];
  await page.mouse.move(box.x + 300, box.y + 300); await wait(300);
  const click = async (p) => { await page.mouse.click(box.x + p[0] * sx, box.y + p[1] * sy); await wait(900); return (/sel=(\S*)/.exec(probe) || [])[1] || ""; };
  if (TYPE === "BBONE") {
    /* Bod křivky nejdál od přímky head-tail: tam křivka je, přímka ne. */
    const far = D.curve.reduce((b, p) => Math.abs(p[1] - D.mid[1]) > Math.abs(b[1] - D.mid[1]) ? p : b);
    const off = Math.abs(far[1] - D.mid[1]); console.log("curve off axis px", Math.round(off));
    check(off > 20, "křivka se liší od přímky"); check((await click(far)) === "bb", `klik na křivku @${far.map(Math.round)}`);
    await click([300, 120]);
    const nearCurve = D.curve.reduce((b, p) => Math.min(b, Math.hypot(p[0] - D.head[0] - (D.tail[0] - D.head[0]) * 0.25, p[1] - D.mid[1])), 1e9);
    const air = [D.head[0] + (D.tail[0] - D.head[0]) * 0.25, D.mid[1]]; console.log("přímka od křivky px", Math.round(nearCurve));
    const s = await click(air); check(nearCurve > 16 && !s, `klik na přímku mimo křivku @${air.map(Math.round)} -> ${s || "(nic)"}`);
  } else if (TYPE === "OCTAHEDRAL") {
    /* Tělo: nejširší místo je v 1/10 délky, polovina šířky = 1/10 délky. Bod na 70 % a bod kousek za okrajem. */
    const L = D.tail[0] - D.head[0], x = D.head[0] + L * 0.1, in7 = L * 0.07; console.log("octa delka px", Math.round(L), "bod od osy px", Math.round(in7));
    check(in7 > 20, "bod na těle je mimo toleranci osy");
    const a = await click([x, D.mid[1] - in7]); check(a === "bb", `klik na tělo octa -> ${a || "(nic)"}`); await click([300, 120]);
    const o = await click([x, D.mid[1] - L * 0.1 - 22]); check(!o, `22 px nad okrajem -> ${o || "(nic)"}`);
  } else {
    check((await click(D.mid)) === "bb", "Stick: klik na úsečku"); await click([300, 120]);
    const s = await click([D.mid[0], D.mid[1] - 22]); check(!s, `Stick: 22 px vedle -> ${s || "(nic)"}`);
    const n = await click([D.mid[0], D.mid[1] - 10]); check(n === "bb", `Stick: 10 px vedle (tolerance) -> ${n || "(nic)"}`);
  }
  await page.screenshot({ path: `out/bone_bbone_${TYPE}.png` });
  await page.context().close();
}
await browser.close();
console.log(fail ? "FAIL: bbone " + fail : "PASS: bbone");
process.exit(fail ? 1 : 0);
