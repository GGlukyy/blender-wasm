/* B1 (VELKA_ZKOUSKA): `?auto=tour&tel=1` = "prohlídka" bez klikání. Projde workspace × shading, Edit, Sculpt, Texture Paint,
 * Geometry Nodes, soubory, export, Rigify a 2D Animation. Každý krok: telEvent tour_step {name, ok, err, ms, gpuerrs, blank, shot}.
 * Vstupy jdou stejnou cestou jako touch.js (syntetické DOM události na canvas), Cmd ne: main.js překládá jen skutečné klávesy.
 * `&tourpart=edit,gp` = jen vybrané části (když prohlídka spadne, zbytek se dá pustit zvlášť). Tabulka: scripts/tour_report.py. */
import { telEvent } from "./telemetry.js";

const PARTS = ["ws", "edit", "sculpt", "texpaint", "gn", "files", "export", "rigify", "gp"];
const _q = new URLSearchParams(location.search);
const want = (_q.get("tourpart") || PARTS.join(",")).split(",");

export const TOUR_PY = `
import json
_G = globals()
def _view():
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == 'VIEW_3D': return w, a, [r for r in a.regions if r.type == 'WINDOW'][0]
    return w, None, None
def _rect():
    w, a, r = _view()
    return [r.x, w.height - r.y - r.height, r.width, r.height] if a else None
def _px(co):
    from bpy_extras import view3d_utils
    w, a, r = _view(); p = view3d_utils.location_3d_to_region_2d(r, a.spaces[0].region_3d, co)
    return None if p is None else [r.x + p.x, w.height - (r.y + p.y)]
def _shade(t):
    w, a, r = _view()
    if a: a.spaces[0].shading.type = t
    return bool(a)
def _state():
    o = bpy.context.view_layer.objects.active; s = {'mode': bpy.context.mode, 'objs': len(bpy.data.objects), 'ws': bpy.context.window_manager.windows[0].workspace.name}
    if o:
        s.update(ob=o.name, type=o.type)
        if o.type == 'MESH':
            if o.mode == 'EDIT': o.update_from_editmode()
            s.update(v=len(o.data.vertices), zsum=round(sum(x.co.z for x in o.data.vertices), 4))
    return s
def _tour_tick():
    if os.path.exists('/tmp/tour_cmd'):
        s = open('/tmp/tour_cmd').read(); os.remove('/tmp/tour_cmd'); out = None
        try:
            if s.startswith('eval:'): out = eval(s[5:], _G)
            else: exec(s, _G)
        except Exception as e: out = {'err': repr(e)}
        _say('AUTO_TOUR_R ' + json.dumps(out))
    return 0.05
bpy.app.timers.register(_tour_tick, first_interval=0.5, persistent=True)
_gated(lambda: _say('AUTO_TOUR_READY'))`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const canvas = () => document.getElementById("canvas");
const dpr = () => window.__DPR__ || 1;
const mouse = (type, x, y, button = 0, buttons = 0) => { const b = canvas().getBoundingClientRect();
  canvas().dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: b.left + x / dpr(), clientY: b.top + y / dpr(), button, buttons })); };
const KEY = (k) => /^[a-z]$/.test(k) ? ["Key" + k.toUpperCase(), k] : /^[0-9]$/.test(k) ? ["Digit" + k, k] : [k, k];
const keyEv = (type, code, key, mods = {}) => window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift }));
const press = async (k, mods = {}, ms = 400) => {
  const [code, key] = KEY(k);
  if (mods.ctrl) keyEv("keydown", "ControlLeft", "Control", { ctrl: true });
  if (mods.shift) keyEv("keydown", "ShiftLeft", "Shift", mods);
  keyEv("keydown", code, key, mods); await sleep(40); keyEv("keyup", code, key, mods);
  if (mods.shift) keyEv("keyup", "ShiftLeft", "Shift", { ctrl: mods.ctrl });
  if (mods.ctrl) keyEv("keyup", "ControlLeft", "Control");
  await sleep(ms);
};
const drag = async (x0, y0, x1, y1, n = 16) => {
  mouse("mousemove", x0, y0); await sleep(200); mouse("mousedown", x0, y0, 0, 1); await sleep(60);
  for (let i = 1; i <= n; i++) { mouse("mousemove", x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 0, 1); await sleep(30); }
  mouse("mouseup", x1, y1, 0, 0); await sleep(800);
};
const click = async (x, y) => { mouse("mousemove", x, y); await sleep(250); mouse("mousedown", x, y, 0, 1); await sleep(70); mouse("mouseup", x, y, 0, 0); await sleep(500); };

let reply = null;
export function tourReply(s) { reply && reply(JSON.parse(s)); }
/* Blender stojí, když překládá shadery: na iPadu klidně minuty. Bez odpovědi do limitu = zaseklý. */
const PY_TIMEOUT = 240000;
const py = (code) => new Promise((res, rej) => {
  const t = setTimeout(() => { reply = null; rej(new Error("HANG: Python neodpověděl do " + PY_TIMEOUT / 1000 + " s")); }, PY_TIMEOUT);
  reply = (v) => { clearTimeout(t); reply = null;
    if (v && v.err) rej(new Error(v.err)); else res(v); };
  const FS = window.Module.FS;
  try { FS.unlink("/tmp/tour_cmd"); } catch (_) {}
  FS.writeFile("/tmp/tour_cmd", code);
});
const ev = (expr) => py("eval:" + expr);
const quiet = async (ms = 1500) => { await ev("0"); await sleep(ms); await ev("0"); };
const check = (cond, msg) => { if (!cond) throw new Error(msg); };

async function shot() {
  const rect = await ev("_rect()").catch(() => null);
  return new Promise((res) => requestAnimationFrame(async () => {
    try {
      const bmp = await createImageBitmap(canvas());
      const s = 256 / Math.max(bmp.width, bmp.height);
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
      /* "chybí obraz" = v oblasti 3D pohledu (bez ní celé plátno) skoro jedna barva */
      const r = rect ? rect.map((v) => Math.round(v * s)) : [0, 0, c.width, c.height];
      const d = g.getImageData(r[0], r[1], Math.max(1, r[2]), Math.max(1, r[3])).data;
      let m = 0, q = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; m += l; q += l * l; n++; }
      const std = Math.sqrt(Math.max(0, q / n - (m / n) * (m / n)));
      res({ url: c.toDataURL("image/jpeg", 0.6), std: Math.round(std * 10) / 10, blank: std < 1 });
    } catch (e) { res({ url: "", std: -1, blank: true, err: String(e) }); }
  }));
}

let cur = null, hung = false, count = 0;
const log = (window.__TOUR = []);
const step = async (name, fn, ms = 1500) => {
  if (hung) return;
  cur = { errs: [] }; telEvent("auto_step", { name });
  const t0 = performance.now(); let ok = true, err = "";
  try { await fn(); await quiet(ms); }
  catch (e) { ok = false; err = String(e.message || e).slice(0, 300); if (err.startsWith("HANG")) hung = true; }
  const dur = Math.round(performance.now() - t0);
  const s = hung ? { url: "", std: -1, blank: true } : await shot();
  const r = { i: count++, name, ok, err, ms: dur, gpuerrs: cur.errs.slice(0, 4), nerr: cur.errs.length, blank: s.blank, std: s.std };
  log.push(r); console.log("TOUR_STEP " + JSON.stringify(r));
  telEvent("tour_step", { ...r, shot: s.url });
};

const reset = () => py("bpy.ops.wm.read_homefile(app_template='', use_factory_startup=True)");
const stateIs = async (f, msg) => { const s = await ev("_state()"); check(f(s), msg + " " + JSON.stringify(s)); return s; };
const mid = async () => { const r = await ev("_rect()"); return [r[0] + r[2] / 2, r[1] + r[3] / 2]; };
const setWs = (n) => py(`bpy.context.window.workspace = bpy.data.workspaces[${JSON.stringify(n)}]`);

const SCEN = {
  ws: async () => {
    for (const n of await ev("[w.name for w in bpy.data.workspaces]")) {
      const id = n.replace(/ /g, "_");
      await step("ws_" + id, () => setWs(n), 2500);
      if (!await ev("bool(_view()[1])")) continue;
      for (const t of ["SOLID", "MATERIAL", "RENDERED", "WIREFRAME"]) await step(`ws_${id}_${t}`, () => py(`_shade('${t}')`), t === "MATERIAL" || t === "RENDERED" ? 4000 : 1500);
      await py("_shade('SOLID')").catch(() => {});
    }
    await setWs("Layout").catch(() => {});
  },
  edit: async () => {
    await step("edit_enter", async () => { await reset(); await sleep(1500); const [x, y] = await mid(); mouse("mousemove", x, y); await sleep(300); await press("Tab", {}, 900); await stateIs((s) => s.mode === "EDIT_MESH", "Tab nepřepnul"); });
    await step("edit_extrude", async () => {
      await py("import bmesh; o=bpy.context.object; b=bmesh.from_edit_mesh(o.data); [f.select_set(False) for f in b.faces]; [e.select_set(False) for e in b.edges]; [v.select_set(False) for v in b.verts]; f=max(b.faces,key=lambda f:f.calc_center_median().z); f.select_set(True); b.select_flush(True); bmesh.update_edit_mesh(o.data)");
      const [x, y] = await mid(); mouse("mousemove", x, y); await sleep(300);
      await press("e"); await press("1"); await press("Enter", {}, 900); await stateIs((s) => s.v === 12, "E 1: čekám 12 vrcholů"); });
    await step("edit_loopcut", async () => {
      /* střed svislé boční hrany nové části, na ni kruh zaskočí */
      const p = await ev("(lambda o: _px(o.matrix_world @ ((o.data.vertices[max(range(8), key=lambda i: o.data.vertices[i].co.x - o.data.vertices[i].co.y + o.data.vertices[i].co.z)].co + o.data.vertices[max(range(8), key=lambda i: o.data.vertices[i].co.x - o.data.vertices[i].co.y - o.data.vertices[i].co.z)].co) / 2)))(bpy.context.object)");
      mouse("mousemove", p[0], p[1]); await sleep(300); await press("r", { ctrl: true }, 900); mouse("mousemove", p[0] + 1, p[1] + 1); await sleep(500);
      await click(p[0] + 1, p[1] + 1); await click(p[0] + 1, p[1] + 1); await sleep(600);
      await stateIs((s) => s.v > 12, "Ctrl+R: vrcholů má přibýt"); });
    await step("edit_undo", async () => { const a = await ev("_state()"); await press("z", { ctrl: true }, 900); await stateIs((s) => s.v < a.v, "Ctrl+Z nevrátil"); });
    await step("edit_redo", async () => { const a = await ev("_state()"); await press("z", { ctrl: true, shift: true }, 900); await stateIs((s) => s.v > a.v, "Ctrl+Shift+Z nevrátil"); });
    await step("edit_exit", async () => { await press("Tab", {}, 900); await stateIs((s) => s.mode === "OBJECT", "Tab zpět"); });
  },
  sculpt: async () => {
    let z0 = 0;
    await step("sculpt_enter", async () => { await reset(); await sleep(1200); await py("bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.3)"); await sleep(600); await setWs("Sculpting"); await sleep(1500); z0 = (await stateIs((s) => s.mode === "SCULPT", "workspace Sculpting")).zsum; }, 2500);
    await step("sculpt_stroke", async () => { const [x, y] = await mid(); await drag(x - 40, y - 30, x + 60, y + 10); await stateIs((s) => s.zsum !== z0, "tah nezměnil mesh"); }, 2000);
    await step("sculpt_undo", async () => { await press("z", { ctrl: true }, 1000); await stateIs((s) => s.zsum === z0, "Ctrl+Z nevrátil"); });
  },
  texpaint: async () => {
    const px = "(lambda p: sum(1 for i in range(0,len(p),4) if p[i]<0.99))(list(bpy.data.images['TOUR'].pixels))";
    await step("texpaint_enter", async () => {
      await reset(); await sleep(1200);
      await py("o=bpy.context.view_layer.objects.active; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT'); img=bpy.data.images.new('TOUR',256,256); img.generated_color=(1,1,1,1); m=bpy.data.materials.new('TM'); m.use_nodes=True; n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; m.node_tree.links.new(n.outputs[0],m.node_tree.nodes['Principled BSDF'].inputs['Base Color']); o.data.materials.clear(); o.data.materials.append(m); m.node_tree.nodes.active=n");
      await sleep(800); await setWs("Texture Paint"); await sleep(1500); await stateIs((s) => s.mode === "PAINT_TEXTURE", "workspace Texture Paint"); }, 2500);
    await step("texpaint_stroke", async () => { await py("bpy.context.tool_settings.image_paint.brush.color=(1,0,0)"); const n0 = await ev(px); const [x, y] = await mid(); await drag(x - 30, y - 20, x + 40, y + 5); const n1 = await ev(px); check(n1 > n0, `tah neobarvil pixely (${n0} -> ${n1})`); }, 2000);
  },
  gn: async () => {
    await step("gn_workspace", async () => { await reset(); await sleep(1200); await setWs("Geometry Nodes"); }, 2500);
    await step("gn_modifier", async () => {
      await py("o=bpy.context.view_layer.objects.active; m=o.modifiers.new('G','NODES'); t=bpy.data.node_groups.new('T','GeometryNodeTree'); t.interface.new_socket('Geometry',in_out='INPUT',socket_type='NodeSocketGeometry'); t.interface.new_socket('Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry'); i=t.nodes.new('NodeGroupInput'); u=t.nodes.new('NodeGroupOutput'); d=t.nodes.new('GeometryNodeDistributePointsOnFaces'); p=t.nodes.new('GeometryNodeInstanceOnPoints'); c=t.nodes.new('GeometryNodeMeshIcoSphere'); r=t.nodes.new('GeometryNodeRealizeInstances'); c.inputs['Radius'].default_value=0.05; d.inputs['Density'].default_value=50; L=t.links.new; L(i.outputs[0],d.inputs['Mesh']); L(d.outputs['Points'],p.inputs['Points']); L(c.outputs['Mesh'],p.inputs['Instance']); L(p.outputs[0],r.inputs[0]); L(r.outputs[0],u.inputs[0]); m.node_group=t");
      await sleep(1500); const n = await ev("len(bpy.context.view_layer.objects.active.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)"); check(n > 100, `scatter: ${n} vrcholů`); }, 2500);
    await step("gn_MATERIAL", () => py("_shade('MATERIAL')"), 4000);
  },
  files: async () => {
    await step("file_save", async () => { await reset(); await sleep(1200); await py("bpy.ops.mesh.primitive_uv_sphere_add(location=(3,0,0))"); await py("bpy.ops.wm.save_as_mainfile(filepath='/opfs/home/tour.blend')"); check(await ev("bpy.data.filepath.endswith('tour.blend')"), "soubor neuložen"); });
    await step("file_new", async () => { await reset(); await sleep(1500); await stateIs((s) => s.objs === 3, "nový soubor"); });
    await step("file_reopen", async () => { await py("bpy.ops.wm.open_mainfile(filepath='/opfs/home/tour.blend')"); await sleep(2000); await stateIs((s) => s.objs === 4, "otevřený soubor"); });
  },
  export: async () => {
    await step("export_gltf", async () => { await py("bpy.ops.export_scene.gltf(filepath='/opfs/home/tour.glb')"); const n = await ev("os.path.getsize('/opfs/home/tour.glb')"); check(n > 100, `glb ${n} B`); });
  },
  rigify: async () => {
    const pick = "(lambda ob: (lambda b: (b.name, _px(ob.matrix_world @ ((b.head + b.tail) / 2))))(ob.pose.bones['NAME']))(bpy.context.object)";
    await step("rigify_generate", async () => {
      await reset(); await sleep(1200);
      await py("bpy.ops.preferences.addon_enable(module='rigify'); bpy.ops.object.select_all(action='DESELECT'); bpy.ops.object.armature_human_metarig_add(); bpy.ops.pose.rigify_generate()");
      await sleep(2000); check(await ev("'rig' in bpy.data.objects or any(o.name.startswith('rig') for o in bpy.data.objects)"), "rig nevznikl"); }, 2500);
    await step("rigify_pose", async () => { await py("o=[o for o in bpy.data.objects if o.name.startswith('rig') and o.type=='ARMATURE'][0]; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='DESELECT')"); await stateIs((s) => s.mode === "POSE", "pose mode"); });
    await step("rigify_click", async () => {
      const name = "torso"; const r = await ev(pick.replace("NAME", name)); check(r[1], "kost mimo pohled");
      await click(r[1][0], r[1][1]); await sleep(700); const a = await ev("bpy.context.active_pose_bone.name if bpy.context.active_pose_bone else ''"); check(a !== "", `klik na ${name} nevybral nic`); });
    await step("rigify_box", async () => {
      await py("bpy.ops.pose.select_all(action='DESELECT')"); const r = await ev("_rect()"); mouse("mousemove", r[0] + r[2] / 2, r[1] + r[3] / 2); await sleep(300); await press("b", {}, 500);
      await drag(r[0] + r[2] * 0.2, r[1] + r[3] * 0.1, r[0] + r[2] * 0.8, r[1] + r[3] * 0.9); const n = await ev("len(bpy.context.selected_pose_bones or [])"); check(n > 0, "box vybral 0 kostí"); });
  },
  gp: async () => {
    const st = "(lambda o: sum(len(d.strokes) for l in o.data.layers for d in [l.current_frame().drawing] if l.current_frame()))(bpy.context.view_layer.objects.active)";
    let n0 = 0;
    await step("gp_template", async () => { await py("bpy.ops.wm.read_homefile(app_template='2D_Animation', use_factory_startup=True)"); await sleep(5000); press("Escape"); await sleep(600); n0 = await ev(st); }, 2500);
    await step("gp_stroke", async () => { const [x, y] = await mid(); await drag(x - 100, y - 30, x + 100, y + 20, 20); const n = await ev(st); check(n === n0 + 1, `tah nepřibyl (${n0} -> ${n})`); }, 2000);
    await step("gp_SOLID", () => py("_shade('SOLID')"), 2000);
    await step("gp_WIREFRAME", () => py("_shade('WIREFRAME')"), 2000);
    await step("gp_undo", async () => { await press("z", { ctrl: true }, 900); const n = await ev(st); check(n === n0, `Ctrl+Z (${n})`); });
  },
};

export async function tourRun() {
  try { new BroadcastChannel("blender-gpuerr").onmessage = (e) => { const m = String(e.data); if (cur && !m.startsWith("PIPE_SPARSE")) cur.errs.push(m.slice(0, 200)); }; } catch (_) {}
  telEvent("tour_start", { touch: navigator.maxTouchPoints, q: location.search, parts: want });
  const t0 = performance.now();
  await sleep(1000); await press("Escape", {}, 600);
  await step("boot", async () => { await stateIs((s) => s.objs === 3, "startovní scéna"); });
  for (const p of PARTS) if (want.includes(p) && !hung) {
    try { await SCEN[p](); }
    catch (e) { await step(p + "_part", () => { throw e; }); }
  }
  const fails = log.filter((r) => !r.ok || r.blank || r.nerr).length;
  console.log(`TOUR_DONE steps=${log.length} problem=${fails} s=${Math.round((performance.now() - t0) / 1000)} hung=${hung}`);
  telEvent("tour_end", { steps: log.length, problem: fails, s: Math.round((performance.now() - t0) / 1000), hung });
  window.__AUTO_DONE = "tour"; telEvent("auto_done", { name: "tour" });
}
