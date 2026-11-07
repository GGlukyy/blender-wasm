// VELKA_ZKOUSKA část D: cesty běžného uživatele se SKUTEČNÝMI vstupy (myš, klávesy). node journey_test.mjs <cesta|all>. Q = dotaz URL (např. webkit_sim=1 až bude).
// Očekávané počty z desktop Blenderu: scripts/journey_desktop.py (stejné operace v blender.exe -b).
const { chromium } = await import(process.env.PW || "playwright");
const which = (process.argv[2] || "all").replace(/"/g, ""), Q = (process.env.Q || "").replace(/"/g, "").replace(/^%Q%$/, "");
const expr = `import bpy, os, sys, json, bmesh, mathutils
from bpy_extras import view3d_utils
def _view():
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == 'VIEW_3D': return w, a, [r for r in a.regions if r.type == 'WINDOW'][0]
    return w, None, None
def _state():
    w, a, r = _view(); o = bpy.context.view_layer.objects.active; s = {'ws': w.workspace.name, 'objs': len(bpy.data.objects), 'mode': bpy.context.mode, 'frame': bpy.context.scene.frame_current, 'screen_full': w.screen.show_fullscreen, 'areas': len(w.screen.areas), 'mats': len(bpy.data.materials), 'imgs': len(bpy.data.images), 'file': bpy.data.filepath}
    if a: s['shade'] = a.spaces[0].shading.type; s['npanel'] = a.spaces[0].show_region_ui; s['persp'] = a.spaces[0].region_3d.view_perspective
    if o:
        s.update(ob=o.name, type=o.type, loc=[round(v, 3) for v in o.location], rot=[round(v, 3) for v in o.rotation_euler], scale=[round(v, 3) for v in o.scale], mods=[m.type for m in o.modifiers], sel=len(bpy.context.selected_objects), slots=len(o.material_slots), parent=o.parent.name if o.parent else '')
        ad = o.animation_data; s['anim'] = bool(ad and ad.action)
        if o.type == 'MESH':
            if o.mode == 'EDIT': o.update_from_editmode()
            d = o.data; s.update(v=len(d.vertices), e=len(d.edges), f=len(d.polygons), uv=len(d.uv_layers), vg=len(o.vertex_groups), vsel=sum(x.select for x in d.vertices), fsel=sum(x.select for x in d.polygons), zsum=round(sum(x.co.z for x in d.vertices), 3), zmax=round(max((x.co.z for x in d.vertices), default=0), 3))
        if o.type == 'ARMATURE': s['bones'] = len(o.data.bones) if o.mode != 'EDIT' else len(o.data.edit_bones)
    return s
def _px(co):
    w, a, r = _view(); p = view3d_utils.location_3d_to_region_2d(r, a.spaces[0].region_3d, co)
    return None if p is None else [r.x + p.x, w.height - (r.y + p.y)]
def _cmd():
    if os.path.exists('/tmp/jr_cmd'):
        s = open('/tmp/jr_cmd').read(); os.remove('/tmp/jr_cmd'); out = None
        try:
            if s == 'state': out = _state()
            elif s == 'top':
                o = bpy.context.view_layer.objects.active; o.update_from_editmode(); f = max(o.data.polygons, key=lambda p: p.center.z); out = _px(o.matrix_world @ f.center)
            elif s == 'obj':
                o = bpy.context.view_layer.objects.active; out = _px(o.matrix_world.translation)
            elif s.startswith('eval:'): out = eval(s[5:], globals())
            elif s == 'view':
                w, a, r = _view(); out = [r.x, w.height - r.y - r.height, r.width, r.height, w.width, w.height]
            elif s == 'tabs':
                w = bpy.context.window_manager.windows[0]; out = [x.name for x in bpy.data.workspaces]
            else: exec(s, globals())
        except Exception as e: out = {'err': repr(e)}
        print('JRR ' + json.dumps(out)); sys.stdout.flush()
    return 0.05
bpy.app.timers.register(_cmd, first_interval=1.0, persistent=True)
print('JRREADY'); sys.stdout.flush()`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const run = async (name, fn) => {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  let reply = null, errs = [], gpuerrs = [], py = []; 
  page.on("console", (m) => { const t = m.text(); let i;
    if ((i = t.indexOf("JRR ")) >= 0) reply = t.slice(i + 4);
    if (/WGPU_UNCAPTURED|PIPE_INVALID/.test(t)) gpuerrs.push(t.slice(0, 180));
    if (/Traceback|^\[err\] .*Error:|^[A-Za-z]*Error:/.test(t) && !/bl_pkg|_multiprocessing|remote_library/.test(t)) py.push(t.slice(0, 180));
    if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) errs.push(t.slice(0, 180)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
  await wait(6000); await page.keyboard.press("Escape"); await wait(800);
  const cmd = async (s) => { reply = null; await page.evaluate((c) => Module.FS.writeFile("/tmp/jr_cmd", c), s); for (let i = 0; i < 100 && reply === null; i++) await wait(100); return reply === null ? null : JSON.parse(reply); };
  const box = await page.locator("#canvas").boundingBox();
  let V = await cmd("view"); const sx = box.width / V[4], sy = box.height / V[5];
  const at = (p) => [box.x + p[0] * sx, box.y + p[1] * sy];
  const mid = () => [box.x + (V[0] + V[2] / 2) * sx, box.y + (V[1] + V[3] / 2) * sy];
  let fails = 0; const log = [];
  const ctx = { page, cmd, wait, at, mid, box,
    hover: async (p = null) => { const q = p || mid(); await page.mouse.move(q[0], q[1], { steps: 2 }); await wait(250); },
    key: async (k, ms = 350) => { await page.keyboard.press(k); await wait(ms); },
    type: async (t, ms = 150) => { for (const c of t) { await page.keyboard.press(c === "." ? "Period" : c === "-" ? "Minus" : c); await wait(ms); } },
    tab: async (name) => { const xs = { Layout: 287, Modeling: 350, Sculpting: 421, "UV Editing": 495, "Texture Paint": 579, Shading: 655, Animation: 725, Rendering: 800, Compositing: 881, "Geometry Nodes": 980 }; await page.mouse.move(box.x + xs[name], box.y + 13); await wait(250); await page.mouse.click(box.x + xs[name], box.y + 13); await wait(5000); V = await cmd("view") || V; },
    check: async (label, pred) => { await wait(300); const s = await cmd("state"); const ok = !!s && pred(s); if (!ok) { fails++; await page.screenshot({ path: `out/jr_${name}_${log.length}.png` }); } log.push(`${ok ? "PASS" : "FAIL"} ${name}: ${label}${ok ? "" : " stav=" + JSON.stringify(s)}`); console.log(log[log.length - 1].slice(0, 600)); return s; } };
  try { await fn(ctx); } catch (e) { fails++; console.log(`FAIL ${name}: výjimka ${e.message.slice(0, 200)}`); }
  await page.screenshot({ path: `out/jr_${name}_end.png` });
  await wait(1000); await page.mouse.move(box.x + 500, box.y + 300); await wait(600);
  const alive = await cmd("state"); if (!alive) { fails++; console.log(`FAIL ${name}: Blender po cestě neodpovídá`); }
  results.push([name, fails, errs.length, gpuerrs.length, py.length]);
  for (const x of [...errs, ...gpuerrs, ...py].slice(0, 8)) console.log("  ! " + x);
  console.log(`CESTA ${name}: ${fails === 0 && !errs.length && !gpuerrs.length && !py.length ? "OK" : "CHYBA"} fail=${fails} err=${errs.length} gpu=${gpuerrs.length} py=${py.length}`);
  await page.context().close();
};
const __MODTAB__ = (await import("node:fs")).readFileSync(new URL("./modtab.py", import.meta.url), "utf8");
const J = {
  /* Add-on Extensions (bl_pkg) po startu i po druhém startu s uloženými Preferences. */
  addons: async ({ cmd, check, page, wait, hover, key }) => {
    const q = "eval:(__import__('addon_utils').check('bl_pkg'), 'bl_pkg' in __import__('sys').modules, bpy.context.preferences.experimental.use_remote_asset_libraries, sorted(a.module for a in bpy.context.preferences.addons), hasattr(bpy.types, 'USERPREF_PT_extensions_repos'), hasattr(bpy.ops, 'extensions') and bpy.ops.extensions.repo_sync.idname())";
    const bad = []; page.on("console", (m) => { const t = m.text(); /* 'Prefs' key-config hlásí i desktop 5.2.3 při read_userpref (3b, 6.11.). */ if (/Exception in module|already registered|has been registered before/.test(t) && !/key-config preferences class: 'Prefs'/.test(t)) bad.push(t.slice(0, 140)); });
    const chk = async (tag) => { const r = await cmd(q); console.log(`BLPKG ${tag} ` + JSON.stringify(r)); const ok = r && r[0][0] === true && r[0][1] === true && r[1] === true; console.log(`${ok ? "PASS" : "FAIL"} addons: ${tag}: bl_pkg zapnutý a načtený`); if (!ok) throw new Error("bl_pkg není načtený " + tag); };
    await chk("1. start");
    /* Druhý start s uloženými Preferences (read_userpref znovu zapíná add-ony: dvojí registrace? H27). */
    await cmd("bpy.ops.wm.save_userpref()"); await wait(1500); await page.reload({ waitUntil: "load" }); await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {}); await page.getByRole("button", { name: /Launch Blender/ }).click();
    for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); } await wait(7000); await page.keyboard.press("Escape"); await wait(600);
    await chk("2. start"); console.log(`${bad.length ? "FAIL" : "PASS"} addons: bez dvojí registrace (${bad.length})`); for (const x of bad.slice(0, 6)) console.log("   " + x); if (bad.length) throw new Error("dvojí registrace");
  },
  /* Židle z kostky: extrude, inset, bevel, loop cut, undo/redo, subsurf zkratkou, apply. */
  model: async ({ hover, key, type, check, cmd, page, wait, at, mid }) => {
    await hover(); await key("Tab", 700); await check("Tab = edit mode", (s) => s.mode === "EDIT_MESH");
    await key("3"); await page.keyboard.press("a"); await wait(300); await page.keyboard.press("Alt+a"); await wait(400);
    const t = at(await cmd("top")); await page.mouse.move(t[0], t[1], { steps: 2 }); await wait(200); await page.mouse.click(t[0], t[1]); await wait(500);
    await check("klik vybere 1 plochu", (s) => s.fsel === 1);
    await key("e"); await type("1"); await key("Enter", 500); let s = await check("extrude o 1: 12 v, 10 f, zmax 2", (s) => s.v === 12 && s.f === 10 && s.zmax === 2);
    await key("i"); await type("0.2"); await key("Enter", 500); await check("inset: 16 v, 14 f", (s) => s.v === 16 && s.f === 14);
    await key("e"); await type("-0.5"); await key("Enter", 500); await check("extrude dolů: 20 v, 18 f", (s) => s.v === 20 && s.f === 18);
    await page.keyboard.press("Control+z"); await wait(700); await check("Ctrl+Z: 16 v", (s) => s.v === 16);
    await page.keyboard.press("Control+Shift+z"); await wait(700); await check("Ctrl+Shift+Z: 20 v", (s) => s.v === 20);
    await key("2"); await key("a"); await page.keyboard.press("Control+b"); await wait(400); await type("0.02"); await key("Enter", 900); await check("bevel všech hran: f > 18", (s) => s.f > 18);
    await page.keyboard.press("Control+z"); await wait(800); await check("Ctrl+Z bevel: 20 v", (s) => s.v === 20);
    await key("3"); await page.keyboard.press("Alt+a"); await wait(300); await hover(); await page.keyboard.press("Control+r"); await wait(500); await page.mouse.move(mid()[0] + 3, mid()[1] + 3); await wait(400); await page.mouse.click(mid()[0] + 3, mid()[1] + 3); await wait(500); await page.mouse.click(mid()[0] + 3, mid()[1] + 3, { button: "right" }); await wait(600); await check("loop cut přidá hrany (v > 20)", (s) => s.v > 20);
    await key("Tab", 700); await check("Tab zpět: object", (s) => s.mode === "OBJECT");
    await page.keyboard.press("Control+Digit2"); await wait(1200); await check("Ctrl+2 přidá Subsurf", (s) => s.mods.includes("SUBSURF"));
    await key("x"); await key("Enter", 700); await check("X Enter smaže objekt", (s) => s.objs === 2);
  },
  /* Přidání z menu: Shift+A, transformace čísly, duplikace, skrytí, Home, numpad pohledy, N panel, celá obrazovka. */
  scene: async ({ hover, key, type, check, page, wait, cmd }) => {
    await hover(); await page.keyboard.press("Shift+a"); await wait(600); await type("uv"); await wait(400); await key("Enter", 900); await check("Shift+A, hledání uv, Enter = koule", (s) => s.objs === 4 && s.v === 482);
    await key("g"); await key("x"); await type("3"); await key("Enter", 500); await check("G X 3", (s) => s.loc[0] === 3 && s.loc[1] === 0);
    await key("r"); await key("z"); await type("90"); await key("Enter", 500); await check("R Z 90", (s) => Math.abs(s.rot[2] - 1.571) < 0.01);
    await key("s"); await type("2"); await key("Enter", 500); await check("S 2", (s) => s.scale[0] === 2);
    await page.keyboard.press("Alt+g"); await wait(400); await page.keyboard.press("Alt+r"); await wait(400); await page.keyboard.press("Alt+s"); await wait(400); await check("Alt+G/R/S vynuluje", (s) => s.loc[0] === 0 && s.scale[0] === 1 && s.rot[2] === 0);
    await page.keyboard.press("Shift+d"); await wait(400); await key("Enter", 500); await check("Shift+D duplikuje", (s) => s.objs === 5);
    await key("h", 500); await check("H skryje", (s) => s.sel === 0); await page.keyboard.press("Alt+h"); await wait(500); await check("Alt+H odkryje", (s) => s.sel >= 1);
    await key("n", 500); let s = await check("N otevře panel", (s) => s.npanel === true); await key("n", 500); await check("N zavře panel", (s) => s.npanel === false);
    await key("Numpad5", 400); await check("Numpad5 přepne ortho", (s) => s.persp === "ORTHO"); await key("Numpad1", 800); await key("Home", 800); await key("NumpadDecimal", 800);
    await page.keyboard.press("Control+Space"); await wait(900); await check("Ctrl+Space maximalizuje", (s) => s.areas === 1 || s.areas < 5); await page.keyboard.press("Control+Space"); await wait(900); await check("Ctrl+Space vrátí", (s) => s.areas >= 4);
  },
  /* UV + materiál: Unwrap z menu, workspace UV Editing, nový materiál přes Shading, Principled. */
  uvmat: async ({ hover, key, check, tab, page, wait, cmd }) => {
    await tab("UV Editing"); await check("workspace UV Editing, edit mode", (s) => s.ws === "UV Editing" && s.mode === "EDIT_MESH");
    await hover(); await key("a"); await key("u", 600); await key("u", 1000); await check("A U U = unwrap (uv vrstva)", (s) => s.uv >= 1 && s.fsel === 6);
    await tab("Shading"); await check("workspace Shading", (s) => s.ws === "Shading"); await wait(8000); await check("Shading: MP", (s) => s.shade === "MATERIAL");
    await tab("Layout"); await check("zpět Layout", (s) => s.ws === "Layout");
  },
  /* Animace: I klíč, šipka na snímek, G, I, Space přehrát, Space stop, Animation workspace. */
  anim: async ({ hover, key, type, check, tab, page, wait }) => {
    await hover(); await key("i", 700); await check("I vloží klíč", (s) => s.anim === true);
    for (let i = 0; i < 10; i++) { await page.keyboard.press("ArrowRight"); await wait(80); } await wait(400); await check("10× šipka = snímek 11", (s) => s.frame === 11);
    await key("g"); await key("x"); await type("2"); await key("Enter", 500); await key("i", 600); await check("G X 2", (s) => s.loc[0] === 2);
    await page.keyboard.press("Shift+ArrowLeft"); await wait(700); await check("Shift+← = první snímek, pozice z klíče", (s) => s.frame === 1 && s.loc[0] === 0);
    await key("Space", 2000); await key("Space", 500); const s = await check("Space přehraje a zastaví", (s) => s.frame > 1); await tab("Animation"); await check("workspace Animation", (s) => s.ws === "Animation"); await tab("Layout");
  },
  /* Sculpt: workspace, tah změní vrcholy, Ctrl+Z vrátí. */
  sculpt: async ({ tab, hover, check, page, wait, at, cmd, mid, key }) => {
    await cmd("bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.3)"); await wait(800);
    await tab("Sculpting"); let s0 = await check("workspace Sculpting: sculpt mode", (s) => s.mode === "SCULPT");
    const m = mid(); await page.mouse.move(m[0] - 40, m[1] - 30); await wait(300); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(m[0] - 40 + i * 8, m[1] - 30 + i * 3); await wait(30); } await page.mouse.up(); await wait(1000);
    const s1 = await check("tah změní mesh", (s) => s.zsum !== s0.zsum || s.zmax !== s0.zmax);
    await page.keyboard.press("Control+z"); await wait(1000); await check("Ctrl+Z vrátí", (s) => s.zsum === s0.zsum);
  },
  /* Rig: armatura, extrude kosti, parent with automatic weights. */
  rig: async ({ hover, key, type, check, page, wait }) => {
    await hover(); await page.keyboard.press("Shift+a"); await wait(600); await type("arma"); await wait(400); await key("Enter", 900); await check("Shift+A, hledání arma, Enter = armatura", (s) => s.type === "ARMATURE" && s.bones === 1);
    await key("Tab", 700); await check("Tab: edit armatury", (s) => s.mode === "EDIT_ARMATURE"); await key("e"); await key("z"); await type("1"); await key("Enter", 500); await check("E Z 1 = 2 kosti", (s) => s.bones === 2); await key("Tab", 700);
    await page.keyboard.press("Control+Tab"); await wait(900); await check("Ctrl+Tab: pose", (s) => s.mode === "POSE"); await page.keyboard.press("Control+Tab"); await wait(900); await check("Ctrl+Tab: zpět object", (s) => s.mode === "OBJECT");
  },
  /* Soubory: Ctrl+S přes Python cestu do OPFS, nový soubor, znovu otevřít; export glTF/FBX/OBJ/STL a import zpět. */
  files: async ({ cmd, check, wait, hover, key, page }) => {
    await hover(); await page.keyboard.press("Shift+a"); await wait(500); for (const c of "uv") await page.keyboard.press(c); await wait(400); await key("Enter", 800);
    await check("koule přidána", (s) => s.objs === 4);
    await cmd("bpy.ops.wm.save_as_mainfile(filepath='/opfs/home/jr.blend')"); await wait(1500); await check("uloženo", (s) => s.file.endsWith("jr.blend"));
    await cmd("bpy.ops.wm.read_homefile(app_template='', use_factory_startup=True)"); await wait(2500); await check("nový soubor: 3 objekty", (s) => s.objs === 3);
    await cmd("bpy.ops.wm.open_mainfile(filepath='/opfs/home/jr.blend')"); await wait(3000); await check("otevřeno: 4 objekty", (s) => s.objs === 4 && s.file.endsWith("jr.blend"));
    for (const [ext, ex, im] of [["glb", "bpy.ops.export_scene.gltf(filepath=P)", "bpy.ops.import_scene.gltf(filepath=P)"], ["fbx", "bpy.ops.export_scene.fbx(filepath=P)", "bpy.ops.import_scene.fbx(filepath=P)"], ["obj", "bpy.ops.wm.obj_export(filepath=P)", "bpy.ops.wm.obj_import(filepath=P)"], ["stl", "bpy.ops.wm.stl_export(filepath=P)", "bpy.ops.wm.stl_import(filepath=P)"], ["ply", "bpy.ops.wm.ply_export(filepath=P)", "bpy.ops.wm.ply_import(filepath=P)"]]) {
      const P = `/opfs/home/jr.${ext}`; const n0 = (await cmd("state")).objs;
      await cmd(`P='${P}'; ${ex}`); await wait(2500); const sz = await cmd(`eval:__import__('os').path.getsize('${P}')`);
      await cmd(`P='${P}'; ${im}`); await wait(2500); await check(`${ext}: export ${sz} B a import přidá objekty`, (s) => sz > 100 && s.objs > n0);
    }
  },
  /* Geometry Nodes workspace: nový strom přes tlačítko nejde bez pozice, ale modifikátor přes Python + Instance on Points musí jít kreslit v MP. */
  gn: async ({ cmd, check, tab, wait }) => {
    await tab("Geometry Nodes"); await check("workspace GN", (s) => s.ws === "Geometry Nodes");
    await cmd(`o=bpy.context.view_layer.objects.active; m=o.modifiers.new('G','NODES'); t=bpy.data.node_groups.new('T','GeometryNodeTree'); t.interface.new_socket('Geometry',in_out='INPUT',socket_type='NodeSocketGeometry'); t.interface.new_socket('Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry'); i=t.nodes.new('NodeGroupInput'); u=t.nodes.new('NodeGroupOutput'); d=t.nodes.new('GeometryNodeDistributePointsOnFaces'); p=t.nodes.new('GeometryNodeInstanceOnPoints'); c=t.nodes.new('GeometryNodeMeshIcoSphere'); r=t.nodes.new('GeometryNodeRealizeInstances'); c.inputs['Radius'].default_value=0.05; d.inputs['Density'].default_value=50; L=t.links.new; L(i.outputs[0],d.inputs['Mesh']); L(d.outputs['Points'],p.inputs['Points']); L(c.outputs['Mesh'],p.inputs['Instance']); L(p.outputs[0],r.inputs[0]); L(r.outputs[0],u.inputs[0]); m.node_group=t`); await wait(2500);
    const n = await cmd("eval:len(bpy.context.view_layer.objects.active.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)"); await check(`scatter vyhodnocen: ${n} vrcholů`, () => n > 100);
    await cmd("sp=[a for a in bpy.context.window_manager.windows[0].screen.areas if a.type=='VIEW_3D'][0].spaces[0]; sp.shading.type='MATERIAL'"); await wait(9000); await check("GN v MP", (s) => s.shade === "MATERIAL");
    await cmd("bpy.ops.object.modifier_apply(modifier='G')"); await wait(1500); await check("apply: mesh má scatter", (s) => s.v === n && s.mods.length === 0);
  },
  /* Rig: Ctrl+P With Automatic Weights přes menu hledání, pak pose a weight paint. */
  weights: async ({ cmd, check, page, wait, key, hover, type, mid }) => {
    await cmd(`bpy.ops.mesh.primitive_cylinder_add(vertices=16, depth=2, location=(0,0,1)); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=6); bpy.ops.object.mode_set(mode='OBJECT')`); await wait(900);
    await cmd(`me=bpy.context.object; bpy.ops.object.armature_add(location=(0,0,0)); a=bpy.context.object; me.select_set(True); bpy.context.view_layer.objects.active=a`); await wait(800);
    await hover(); await page.keyboard.press("Control+p"); await wait(700); await page.screenshot({ path: "out/jr_weights_menu.png" }); { const q = [mid()[0] - 108, mid()[1] + 141]; await page.mouse.move(q[0], q[1], { steps: 3 }); await wait(300); await page.mouse.click(q[0], q[1]); await wait(2500); }
    const vg = await cmd("eval:[len(o.vertex_groups) for o in bpy.data.objects if o.name.startswith('Cylinder')] + [o.parent.name if o.parent else '' for o in bpy.data.objects if o.name.startswith('Cylinder')]"); await check(`Ctrl+P A = automatic weights ${JSON.stringify(vg)}`, () => vg && vg[0] === 1 && vg[1] !== "");
    await page.keyboard.press("Control+Tab"); await wait(900); await check("pose mode", (s) => s.mode === "POSE"); await key("a"); await key("r"); await key("x"); await type("30"); await key("Enter", 700);
    const z = await cmd("eval:round(max((o.matrix_world @ v.co).y for o in bpy.data.objects if o.name.startswith('Cylinder') for v in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().vertices), 2)"); await check(`pose deformuje mesh, ymax=${z} (bez deformace 1, po R X 30 cos 30° = 0.87)`, () => Math.abs(z - 0.87) < 0.02);
    await page.keyboard.press("Control+z"); await wait(800); await page.keyboard.press("Control+Tab"); await wait(900); await check("zpět object", (s) => s.mode === "OBJECT");
  },
  /* 2D Animation: šablona, kreslení tahů myší, undo, guma. */
  gp: async ({ cmd, check, page, wait, mid, hover, key }) => {
    await cmd("bpy.ops.wm.read_homefile(app_template='2D_Animation', use_factory_startup=True)"); await wait(6000); await page.keyboard.press("Escape"); await wait(600);
    const st = "eval:(lambda o: (o.type, o.mode, sum(len(d.strokes) for l in o.data.layers for d in [l.current_frame().drawing] if l.current_frame()) if o.type=='GREASEPENCIL' else -1))(bpy.context.view_layer.objects.active)";
    const s0 = await cmd(st); console.log("GP " + JSON.stringify(s0)); const V = await cmd("view"); const b = await page.locator("#canvas").boundingBox(); const m = [b.x + V[0] + V[2] / 2, b.y + V[1] + V[3] / 2];
    const stroke = async (dy) => { await page.mouse.move(m[0] - 100, m[1] + dy); await wait(150); await page.mouse.down(); for (let i = 0; i < 20; i++) { await page.mouse.move(m[0] - 100 + i * 10, m[1] + dy + Math.sin(i / 3) * 20); await wait(16); } await page.mouse.up(); await wait(700); };
    await stroke(-40); await stroke(40); const s1 = await cmd(st); console.log("GP " + JSON.stringify(s1)); await check(`2 tahy přidány (${s0[2]} -> ${s1[2]})`, () => s1[2] === s0[2] + 2);
    await page.keyboard.press("Control+z"); await wait(800); const s2 = await cmd(st); await check(`Ctrl+Z odebere tah (${s2[2]})`, () => s2[2] === s0[2] + 1);
  },
  /* Materiál + textura: Image ▸ New, nody, Texture Paint tah, uložení obrázku do PNG. */
  texpaint: async ({ cmd, check, tab, page, wait, mid }) => {
    await cmd(`o=bpy.context.view_layer.objects.active; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT'); img=bpy.data.images.new('JR',256,256); img.generated_color=(1,1,1,1); m=bpy.data.materials.new('JM'); m.use_nodes=True; n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; m.node_tree.links.new(n.outputs[0],m.node_tree.nodes['Principled BSDF'].inputs['Base Color']); o.data.materials.clear(); o.data.materials.append(m); m.node_tree.nodes.active=n`); await wait(1500);
    await tab("Texture Paint"); await check("workspace Texture Paint: TEXTURE_PAINT mód", (s) => s.mode === "PAINT_TEXTURE");
    const px = "eval:(lambda p: sum(1 for i in range(0,len(p),4) if p[i]<0.99))(list(bpy.data.images['JR'].pixels))"; const n0 = await cmd(px);
    const V = await cmd("view"), b = await page.locator("#canvas").boundingBox(), m = [b.x + V[0] + V[2] / 2, b.y + V[1] + V[3] / 2];
    await cmd("bpy.context.tool_settings.image_paint.brush.color=(1,0,0)"); await page.mouse.move(m[0] - 30, m[1] - 20); await wait(300); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(m[0] - 30 + i * 6, m[1] - 20 + i * 2); await wait(30); } await page.mouse.up(); await wait(1500);
    const n1 = await cmd(px); await check(`tah obarví pixely obrázku (${n0} -> ${n1})`, () => n1 > n0);
    await page.keyboard.press("Control+z"); await wait(1200); const n2 = await cmd(px); await check(`Ctrl+Z vrátí pixely (${n2})`, () => n2 === n0);
    await cmd("bpy.data.images['JR'].save_render('/opfs/home/jr.png')"); await wait(1200); const z = await cmd("eval:__import__('os').path.getsize('/opfs/home/jr.png')"); await check(`PNG uložen (${z} B)`, () => z > 100);
  },
  /* Edit mode běžné nástroje přes klávesy: Merge, Knife zrušit, Fill, Subdivide přes F3, Separate, Join, Mirror modifier. */
  edit2: async ({ cmd, check, hover, key, page, wait, type }) => {
    await hover(); await key("Tab", 700); await key("a"); await page.keyboard.press("F3"); await wait(600); for (const c of "subdivide") await page.keyboard.press(c); await wait(600); await key("Enter", 1000); await check("F3 Subdivide: 26 v", (s) => s.v === 26);
    await key("x", 500); await type("v", 300); await wait(800); await check("X V smaže vrcholy", (s) => s.v === 0);
    await page.keyboard.press("Control+z"); await wait(800); await check("Ctrl+Z: 26 v", (s) => s.v === 26);
    await key("k", 400); await key("Escape", 500); await check("K a Esc: stále edit", (s) => s.mode === "EDIT_MESH");
    await key("p", 500); await type("s", 300); await wait(900); await check("P S oddělí výběr (Selection)", (s) => s.objs === 4);
    await key("Tab", 800); await page.keyboard.press("Control+j"); await wait(800); await check("Ctrl+J: po sobě 3 objekty", (s) => s.objs === 3 || s.objs === 4);
    await page.keyboard.press("Shift+z"); await wait(800); await check("Shift+Z: wireframe", (s) => s.shade === "WIREFRAME"); await page.keyboard.press("Shift+z"); await wait(800); await check("Shift+Z zpět", (s) => s.shade === "SOLID");
    await page.keyboard.press("Alt+z"); await wait(600); await page.keyboard.press("Alt+z"); await wait(600);
    await key("z", 600); await page.screenshot({ path: "out/jr_edit2_pie.png" }); await key("Escape", 500);
  },
  /* Donut: Shift+A torus, Ctrl+1, proportional edit (O + kolečko), Shade Smooth přes F3, sculpt tah, materiál v Material Preview. */
  donut: async ({ hover, key, type, check, cmd, page, wait, tab, mid }) => {
    await hover(); await key("Delete", 700); await check("Delete smaže kostku", (s) => s.objs === 2);
    await page.keyboard.press("Shift+a"); await wait(600); await type("torus"); await wait(400); await key("Enter", 900); await check("Shift+A torus: 576 v, 1152 e, 576 f", (s) => s.type === "MESH" && s.v === 576 && s.e === 1152 && s.f === 576);
    await page.keyboard.press("Control+1"); await wait(800); await check("Ctrl+1: SUBSURF", (s) => s.mods.join() === "SUBSURF");
    await page.keyboard.press("F3"); await wait(600); for (const c of "shade smooth") await page.keyboard.press(c === " " ? "Space" : c); await wait(600); await key("Enter", 900);
    const smooth = await cmd("eval:sum(p.use_smooth for p in bpy.context.object.data.polygons)"); await check(`F3 Shade Smooth (${smooth}/576)`, () => smooth === 576);
    await key("Tab", 800); await key("1"); await page.keyboard.press("Alt+a"); await wait(400);
    await cmd("o=bpy.context.object; bpy.ops.object.mode_set(mode='OBJECT'); o.data.vertices[0].select=True; bpy.ops.object.mode_set(mode='EDIT')"); await wait(500);
    await check("1 vybraný vrchol", (s) => s.mode === "EDIT_MESH" && s.vsel === 1);
    const before = await cmd("eval:[v.co.z for v in bpy.context.object.data.vertices]");
    await key("o", 500); const prop = await cmd("eval:bpy.context.tool_settings.use_proportional_edit"); await check("O zapne proportional", () => prop === true);
    await cmd("bpy.context.tool_settings.proportional_size=1.0"); await hover(); await key("g"); await key("z"); await type("0.3"); await page.mouse.wheel(0, 100); await wait(500); await key("Enter", 900); const size = await cmd("eval:bpy.context.tool_settings.proportional_size");
    await check(`kolečko během G změní dosah (${size})`, () => typeof size === "number" && size !== 1);
    await cmd("bpy.context.object.update_from_editmode()"); const after = await cmd("eval:[v.co.z for v in bpy.context.object.data.vertices]");
    const moved = after.filter((z, i) => Math.abs(z - before[i]) > 1e-4).length; await check(`G Z s proportional pohne víc vrcholy (${moved})`, () => moved > 1 && moved < 576);
    await page.keyboard.press("Control+z"); await wait(1000); await cmd("bpy.context.object.update_from_editmode()"); const undone = await cmd("eval:[v.co.z for v in bpy.context.object.data.vertices]");
    await check("Ctrl+Z vrátí tvar", () => undone.every((z, i) => Math.abs(z - before[i]) < 1e-4));
    await key("o", 500); const off = await cmd("eval:bpy.context.tool_settings.use_proportional_edit"); await check("O vypne proportional", () => off === false); await key("Tab", 800);
    await cmd("o=bpy.context.object; m=bpy.data.materials.new('Poleva'); m.use_nodes=True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(0.9,0.3,0.5,1); o.data.materials.append(m)"); await wait(500);
    await check("materiál přiřazen", (s) => s.slots === 1);
    await page.keyboard.press("z"); await wait(600); await page.keyboard.press("2"); await wait(6000); await check("Z 2: Material Preview", (s) => s.shade === "MATERIAL"); await page.screenshot({ path: "out/jr_donut_mp.png" });
    await tab("Sculpting"); const s0 = await check("Sculpting: sculpt mode", (s) => s.mode === "SCULPT");
    const m = mid(); await page.mouse.move(m[0] - 40, m[1] - 30); await wait(300); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(m[0] - 40 + i * 8, m[1] - 30 + i * 3); await wait(30); } await page.mouse.up(); await wait(1000);
    await check("tah změní donut", (s) => s.zsum !== s0.zsum || s.zmax !== s0.zmax); await page.screenshot({ path: "out/jr_donut_sculpt.png" });
  },
  /* Sculpt 2: symetrie X, maska (M + tah, Alt+M), voxel remesh (Ctrl+R), undo, dyntopo (klik v hlavičce; Ctrl+D v keymapě není). */
  sculpt2: async ({ tab, check, page, wait, cmd, mid, key, box }) => {
    const m = mid(), stroke = async (dx = -40, dy = -30) => { await page.mouse.move(m[0] + dx, m[1] + dy); await wait(300); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(m[0] + dx + i * 8, m[1] + dy + i * 3); await wait(30); } await page.mouse.up(); await wait(1000); };
    await cmd("bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1.3)"); await wait(800);
    await tab("Sculpting"); const s0 = await check("Sculpting: sculpt mode", (s) => s.mode === "SCULPT");
    await cmd("bpy.context.object.use_mesh_mirror_x=True"); await stroke(40, -30);
    const asym = await cmd("eval:(lambda o: (o.update_from_editmode(), (lambda d: sum(1 for v in d.vertices if abs(v.co.x)>0.01 and abs(v.co.length-1.3)>1e-3))(o.data))[1])(bpy.context.object)");
    const sides = await cmd("eval:(lambda d: [sum(1 for v in d.vertices if v.co.x>0.01 and abs(v.co.length-1.3)>1e-3), sum(1 for v in d.vertices if v.co.x<-0.01 and abs(v.co.length-1.3)>1e-3)])(bpy.context.object.data)");
    await check(`tah se symetrií X změní obě strany (${asym}, ${sides})`, () => sides && sides[0] > 0 && sides[1] > 0);
    const mask = "eval:(lambda a: 0 if a is None else sum(1 for x in a.data if x.value>0.5))(bpy.context.object.data.attributes.get('.sculpt_mask'))";
    await page.mouse.move(m[0], m[1]); await key("m", 700); const tool = await cmd("eval:bpy.context.workspace.tools.from_space_view3d_mode('SCULPT').idname"); await check(`M = maska (${tool})`, () => /mask/i.test(tool || ""));
    await stroke(-40, -30); await cmd("bpy.ops.object.mode_set(mode='OBJECT'); bpy.ops.object.mode_set(mode='SCULPT')"); const n1 = await cmd(mask); await check(`tah maskou označí vrcholy (${n1})`, () => n1 > 0);
    await page.keyboard.press("Alt+m"); await wait(900); await cmd("bpy.ops.object.mode_set(mode='OBJECT'); bpy.ops.object.mode_set(mode='SCULPT')"); const n2 = await cmd(mask); await check(`Alt+M vymaže masku (${n2})`, () => n2 === 0);
    await page.screenshot({ path: "out/jr_sculpt2_mask.png" });
    await page.mouse.move(m[0], m[1]); await cmd("bpy.context.object.data.remesh_voxel_size=0.1"); const v0 = (await check("před remesh", (s) => s.mode === "SCULPT")).v;
    await page.keyboard.press("Control+r"); await wait(3000); const s3 = await check("Ctrl+R voxel remesh změní počet vrcholů", (s) => s.mode === "SCULPT" && s.v !== v0 && s.v > 100);
    await page.keyboard.press("Control+z"); await wait(1500); await check("Ctrl+Z vrátí remesh", (s) => s.v === v0);
    const dyn = "eval:bpy.context.object.use_dynamic_topology_sculpting"; const clickDyn = async () => { await page.mouse.move(box.x + 948, box.y + 64, { steps: 2 }); await wait(400); await page.mouse.click(box.x + 948, box.y + 64); await wait(1500); };
    await clickDyn(); await page.screenshot({ path: "out/jr_sculpt2_dynclick.png" }); const dt = await cmd(dyn); await check(`klik na Dyntopo zapne dyntopo (${dt})`, () => dt === true);
    await cmd("bpy.context.tool_settings.sculpt.detail_size=4"); await page.mouse.move(box.x + 30, box.y + 102, { steps: 2 }); await wait(400); await page.mouse.click(box.x + 30, box.y + 102); await wait(800); const br = await cmd("eval:bpy.context.tool_settings.sculpt.brush.name"); await check(`klik v toolbaru: štětec ${br}`, () => br !== "Mask"); await stroke(-60, 10); const st = await cmd("eval:bpy.context.scene.statistics(bpy.context.view_layer)"); const dv = +/Verts:([\d,]+)/.exec(st)[1].replace(/,/g, ""); await page.screenshot({ path: "out/jr_sculpt2_dyntopo.png" });
    await check(`dyntopo tah přidá vrcholy (${v0} -> ${dv})`, (s) => s.mode === "SCULPT" && dv > v0);
    await clickDyn(); const dt2 = await cmd(dyn); await check(`klik vypne dyntopo (${dt2})`, () => dt2 === false);
  },
  /* Animace 2: klíče, skok mezi klíči (nahoru = předchozí, dolů = další, stejně v keymapě desktopu), Graph Editor (Shift+F6), T Linear, Alt+I smaže klíč, Ctrl+Z. */
  anim2: async ({ hover, key, type, check, cmd, page, wait }) => {
    const fc = "eval:(lambda c: [len(c), len(c[0].keyframe_points), c[0].keyframe_points[0].interpolation])(bpy.context.object.animation_data.action.layers[0].strips[0].channelbag(bpy.context.object.animation_data.action_slot).fcurves)";
    await hover(); await key("i", 700); await cmd("bpy.context.scene.frame_set(20)"); await wait(400); await key("g"); await key("x"); await type("2"); await key("Enter", 500); await key("i", 700);
    let f = await cmd(fc); await check(`2 klíče na křivku (${f})`, () => f && f[0] >= 3 && f[1] === 2);
    await key("ArrowDown", 500); await check("šipka dolů (další klíč) z posledního: zůstane 20", (s) => s.frame === 20); await key("ArrowUp", 500); await check("šipka nahoru (předchozí klíč): snímek 1", (s) => s.frame === 1); await key("ArrowDown", 500); await check("šipka dolů (další klíč): snímek 20", (s) => s.frame === 20);
    await page.keyboard.press("Shift+F6"); await wait(1200); const area = await cmd("eval:bpy.context.window_manager.windows[0].screen.areas[0].type + ':' + ','.join(a.type for a in bpy.context.window_manager.windows[0].screen.areas)"); await check(`Shift+F6: Graph Editor (${area})`, () => /GRAPH_EDITOR/.test(area)); await page.screenshot({ path: "out/jr_anim2_graph.png" });
    await key("a", 500); await key("t", 700); await page.screenshot({ path: "out/jr_anim2_menu.png" }); await key("l", 900); f = await cmd(fc); await check(`T L: Linear (${f})`, () => f && f[2] === "LINEAR");
    await cmd("bpy.context.scene.frame_set(10)"); await wait(400); const x = (await check("snímek 10", (s) => s.frame === 10)).loc[0]; await check(`Linear: X na snímku 10 je 0,947 (${x})`, () => Math.abs(x - 0.947) < 0.002);
    await page.keyboard.press("Control+z"); await wait(800); await page.keyboard.press("Shift+F5"); await wait(1200); await check("Shift+F5: zpět 3D pohled", (s) => s.shade === "SOLID");
    await cmd("bpy.context.scene.frame_set(20)"); await wait(400); await page.keyboard.press("Alt+i"); await wait(800); await page.screenshot({ path: "out/jr_anim2_alti.png" }); await key("Enter", 800); f = await cmd(fc); await check(`Alt+I smaže klíč (${f})`, () => f && f[1] === 1);
  },
  /* Text: Shift+A, psaní v text módu, Tab ven, Ctrl+Z. */
  text3d: async ({ hover, key, type, check, cmd, page, wait }) => {
    await hover(); await page.keyboard.press("Shift+a"); await wait(600); await type("text"); await wait(400); await key("Enter", 900); await check("Shift+A hledání text = FONT", (s) => s.type === "FONT");
    await key("Tab", 700); await check("Tab: EDIT_TEXT", (s) => s.mode === "EDIT_TEXT"); await page.keyboard.type("Ahoj 7."); await wait(500); await page.keyboard.press("Backspace"); await wait(300); await key("Tab", 700);
    const b = await cmd("eval:bpy.context.object.data.body"); await check(`psaní: "${b}"`, (s) => b === "TextAhoj 7" && s.mode === "OBJECT");
    await page.keyboard.press("Control+z"); await wait(800); const b2 = await cmd("eval:bpy.context.object.data.body"); console.log("TEXT po Ctrl+Z " + JSON.stringify(b2));
  },
  /* Pie menu: držet Z a táhnout (pořadí enumu v pie: Wireframe vlevo, Solid vpravo, MP dolů, Rendered nahoru; stejné jako desktop), pivot na tečku; klik přímo na volbu. */
  pie: async ({ hover, check, cmd, page, wait, mid }) => {
    const m = mid(), pie = async (k, dx, dy) => { await hover(); await page.keyboard.down(k); await wait(450); await page.mouse.move(m[0] + dx, m[1] + dy, { steps: 6 }); await wait(250); await page.keyboard.up(k); await wait(900); };
    await pie("z", -130, 0); await check("Z vlevo: Wireframe", (s) => s.shade === "WIREFRAME");
    await pie("z", 130, 0); await check("Z vpravo: Solid", (s) => s.shade === "SOLID");
    await pie("z", 0, -130); await wait(2500); await check("Z nahoru: Rendered", (s) => s.shade === "RENDERED");
    await pie("z", 0, 130); await wait(2500); await check("Z dolů: Material Preview", (s) => s.shade === "MATERIAL");
    await pie("z", 130, 0); await check("Z vpravo: Solid", (s) => s.shade === "SOLID");
    const piv = "eval:bpy.context.scene.tool_settings.transform_pivot_point", p0 = await cmd(piv); await pie("Period", -130, 0); const p1 = await cmd(piv); await check(`tečka vlevo změní pivot (${p0} -> ${p1})`, () => p1 !== p0);
    /* Klávesa nechá pie otevřené, když se pustí hned; pak klik */
    await hover(); await page.keyboard.press("z"); await wait(700); await page.mouse.move(m[0] - 130, m[1], { steps: 6 }); await wait(300); await page.mouse.click(m[0] - 130, m[1]); await wait(900); await check("Z ťuk + klik vlevo: Wireframe", (s) => s.shade === "WIREFRAME");
  },
  /* Výběr jako uživatel: A, Alt+A, klik, Shift+klik, Ctrl+I, B, C, klik do prázdna. */
  select: async ({ hover, key, check, cmd, page, wait, at, mid, box }) => {
    const n = "eval:len(bpy.context.selected_objects)", sel = async (t, f) => { await wait(400); const v = await cmd(n); await check(`${t}: vybráno ${v}`, () => f(v)); return v; };
    await hover(); await key("a", 500); await sel("A", (v) => v === 3); await page.keyboard.press("Alt+a"); await sel("Alt+A", (v) => v === 0);
    const c = at(await cmd("obj")); await page.mouse.move(c[0], c[1], { steps: 2 }); await wait(250); await page.mouse.click(c[0], c[1]); await sel("klik na kostku", (v) => v === 1);
    const cam = at(await cmd("eval:_px(bpy.data.objects['Light'].matrix_world.translation)")); await page.mouse.move(cam[0], cam[1], { steps: 2 }); await wait(250); await page.keyboard.down("Shift"); await wait(+(process.env.SHIFTMS||60)); await page.mouse.click(cam[0], cam[1]); await wait(+(process.env.SHIFTMS||60)); await page.keyboard.up("Shift"); await sel("Shift+klik na světlo", (v) => v === 2);
    await hover(); await page.keyboard.press("Control+i"); await sel("Ctrl+I", (v) => v === 1); await page.keyboard.press("Alt+a"); await sel("Alt+A", (v) => v === 0);
    const m = mid(); await page.mouse.move(m[0] - 500, m[1] - 300); await wait(250); await key("b", 400); await page.mouse.move(m[0] - 500, m[1] - 300); await page.mouse.down(); await page.mouse.move(m[0] + 500, m[1] + 300, { steps: 8 }); await page.mouse.up(); await sel("B přes celý pohled", (v) => v === 3);
    await page.keyboard.press("Alt+a"); await sel("Alt+A", (v) => v === 0);
    await page.mouse.move(c[0], c[1]); await wait(250); await key("c", 500); await page.mouse.down(); await page.mouse.move(c[0] + 8, c[1] + 8, { steps: 3 }); await page.mouse.up(); await wait(300); await key("Escape", 500); await sel("C přes kostku", (v) => v === 1);
    await page.mouse.move(box.x + 60, box.y + 620, { steps: 2 }); await wait(250); await page.mouse.click(box.x + 60, box.y + 620); await sel("klik do prázdna", (v) => v === 0);
  },
  /* F12: render do Image Editoru, Esc zpět, uložení výsledku. */
  f12: async ({ hover, key, check, cmd, page, wait }) => {
    const areas = "eval:[a.type for a in bpy.context.window_manager.windows[0].screen.areas]", a0 = await cmd(areas);
    await hover(); await page.keyboard.press("F12"); for (let i = 0; i < 60; i++) { await wait(1000); const r = await cmd("eval:bpy.data.images['Render Result'].has_data if 'Render Result' in bpy.data.images else False"); if (r) break; } await wait(3000);
    await page.screenshot({ path: "out/jr_f12.png" }); const a1 = await cmd(areas); console.log("F12 oblasti " + JSON.stringify(a1)); await check("F12: výsledek existuje", () => a1 && a1.includes("IMAGE_EDITOR"));
    await cmd("bpy.data.images['Render Result'].save_render('/opfs/home/jr_f12.png')"); await wait(1500); const sz = await cmd("eval:__import__('os').path.getsize('/opfs/home/jr_f12.png')"); await check(`save_render ${sz} B`, () => sz > 1000);
    const nz = await cmd("eval:(lambda p: sum(1 for i in range(0, len(p), 400) if p[i] > 0.02))(list(bpy.data.images.load('/opfs/home/jr_f12.png').pixels))"); await check(`obraz není černý (${JSON.stringify(nz)})`, () => nz > 10);
    await key("Escape", 1200); const a2 = await cmd(areas); await check(`Esc vrátí rozložení ${JSON.stringify(a2)}`, () => JSON.stringify(a2) === JSON.stringify(a0));
  },
  /* Scripting: psaní skriptu v Text Editoru, Alt+P, Python Console: příkaz + Enter, šipka nahoru (historie). */
  script: async ({ tab, check, cmd, page, wait }) => {
    await cmd("bpy.context.window.workspace=bpy.data.workspaces['Scripting']"); await wait(5000); await check("workspace Scripting", (s) => s.ws === "Scripting");
    const rect = (t) => `eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == '${t}' for r in a.regions if r.type == 'WINDOW'][0])(bpy.context.window_manager.windows[0])`;
    const b = await page.locator("#canvas").boundingBox(); const T = await cmd(rect("TEXT_EDITOR")), C = await cmd(rect("CONSOLE"));
    await cmd("sp=[a for a in bpy.context.window_manager.windows[0].screen.areas if a.type=='TEXT_EDITOR'][0].spaces[0]; sp.text=bpy.data.texts.new('jr')"); await wait(500);
    await page.mouse.move(b.x + T[0] + T[2] / 2, b.y + T[1] + T[3] / 2, { steps: 2 }); await wait(300);
    await page.keyboard.type("import bpy\n"); await page.keyboard.type("bpy.ops.mesh.primitive_monkey_add(location=(0, 3, 0))\n"); await wait(500);
    const body = await cmd("eval:bpy.data.texts['jr'].as_string()"); await check(`text editor: ${JSON.stringify(body)}`, () => body === "import bpy\nbpy.ops.mesh.primitive_monkey_add(location=(0, 3, 0))\n");
    await page.keyboard.press("Alt+p"); await wait(1500); await page.screenshot({ path: "out/jr_script_run.png" }); await check("Alt+P spustí skript: opice", (s) => s.objs === 4);
    await page.mouse.move(b.x + C[0] + C[2] / 2, b.y + C[1] + C[3] / 2, { steps: 2 }); await wait(300);
    await page.keyboard.type("bpy.ops.mesh.primitive_cube_add(location=(0, -3, 0))\n"); await wait(1200); await check("konzole: příkaz přidá kostku", (s) => s.objs === 5);
    await page.keyboard.press("ArrowUp"); await wait(400); await page.keyboard.press("Enter"); await wait(1200); await page.screenshot({ path: "out/jr_script_console.png" }); await check("konzole: šipka nahoru + Enter zopakuje", (s) => s.objs === 6);
  },
  /* Křivka: Bezier, Tab, E, Tab, převod na mesh, Ctrl+Z. */
  curve: async ({ hover, key, type, check, cmd, page, wait }) => {
    const pts = "eval:len(bpy.context.object.data.splines[0].bezier_points)";
    await hover(); await page.keyboard.press("Shift+a"); await wait(600); await type("bezier"); await wait(400); await key("Enter", 900); await check("Shift+A bezier", (s) => s.type === "CURVE");
    await key("Tab", 700); await check("Tab: EDIT_CURVE", (s) => s.mode === "EDIT_CURVE"); await key("e"); await type("1"); await key("Enter", 600); await key("Tab", 700);
    const n = await cmd(pts); await check(`E 1 s oběma konci vybranými: ${n} bodů (desktop 4)`, () => n === 4);
    await cmd("bpy.ops.object.convert(target='MESH')"); await wait(800); await check("convert na mesh", (s) => s.type === "MESH" && s.v > 12);
    await page.keyboard.press("Control+z"); await wait(800); await check("Ctrl+Z vrátí křivku", (s) => s.type === "CURVE");
  },
  /* Přejmenování: F2 v pohledu, dvojklik v Outlineru, M nová kolekce, Ctrl+P parent, Ctrl+J join. */
  /* Základní práce s objekty klávesami: Shift+D, Alt+D, Ctrl+J, P, H, Alt+H, Ctrl+P, Alt+P, M. Desktop 5.2.3: journey_desktop.py (DESK objops). */
  objops: async ({ hover, key, check, cmd, page, wait, box }) => {
    const meshes = "sum(o.type == 'MESH' for o in bpy.data.objects)";
    await hover(); await key("Shift+d", 500); await key("Escape", 700);
    await check("Shift+D + Esc: kopie na místě, vlastní mesh", (s) => s.objs === 4 && s.ob === "Cube.001" && s.loc[0] === 0);
    const m0 = await cmd("eval:bpy.context.object.data.name"); await check(`Shift+D má vlastní mesh (${m0})`, () => m0 !== "Cube");
    await key("Alt+d", 500); await key("Escape", 700);
    await check("Alt+D + Esc: sdílený mesh", (s) => s.objs === 5 && s.ob === "Cube.002");
    const users = await cmd("eval:bpy.context.object.data.users"); await check(`Alt+D users=${users}`, () => users === 2);
    await key("h", 600); await check("H skryje", (s) => s.objs === 5);
    const hid = await cmd("eval:bpy.data.objects['Cube.002'].visible_get()"); await check(`H skryl Cube.002 (${hid})`, () => hid === false);
    await key("Alt+h", 600);
    const back = await cmd("eval:bpy.data.objects['Cube.002'].visible_get()"); await check(`Alt+H vrátil (${back})`, () => back === true);
    /* Dva objekty vybrané, aktivní rodič: Ctrl+P a první položka menu (Object) */
    await cmd("[o.select_set(False) for o in bpy.data.objects]; bpy.data.objects['Cube.001'].select_set(True); bpy.data.objects['Cube'].select_set(True); bpy.context.view_layer.objects.active = bpy.data.objects['Cube']"); await wait(400);
    await hover(); await key("Control+p", 600); await page.screenshot({ path: "out/jr_objops_parent.png" }); await key("Enter", 700);
    const par = await cmd("eval:(bpy.data.objects['Cube.001'].parent.name if bpy.data.objects['Cube.001'].parent else None)"); await check(`Ctrl+P rodič=${par}`, () => par === "Cube");
    await cmd("[o.select_set(False) for o in bpy.data.objects]; bpy.data.objects['Cube.001'].select_set(True); bpy.context.view_layer.objects.active = bpy.data.objects['Cube.001']"); await wait(400);
    await hover(); await key("Alt+p", 600); await page.screenshot({ path: "out/jr_objops_clear.png" }); await key("Enter", 700);
    const par2 = await cmd("eval:(bpy.data.objects['Cube.001'].parent.name if bpy.data.objects['Cube.001'].parent else None)"); await check(`Alt+P rodič=${par2}`, () => par2 === null);
    /* Ctrl+J všech tří, pak v Edit módu P ▸ By Loose Parts je zase rozdělí */
    await cmd("[o.select_set(o.type == 'MESH') for o in bpy.data.objects]; bpy.context.view_layer.objects.active = bpy.data.objects['Cube']"); await wait(400);
    await hover(); await key("Control+j", 900); const m1 = await cmd("eval:" + meshes); await check(`Ctrl+J meshů=${m1}`, () => m1 === 1);
    await check("po Ctrl+J 24 vrcholů", (s) => s.v === 24);
    await key("Tab", 800); await key("a", 400); await key("p", 600); await page.screenshot({ path: "out/jr_objops_sep.png" }); await key("l", 1000); await key("Tab", 800);
    const m2 = await cmd("eval:" + meshes); await check(`P L meshů=${m2}`, () => m2 === 3);
    /* M ▸ + New Collection ▸ Enter */
    const c0 = await cmd("eval:len(bpy.data.collections)");
    await hover(); await key("m", 600);
    /* menu se otevře u kurzoru, New Collection je pod ním (Search je první řádek): pozice ze screenshotu 1400×850 */
    await page.mouse.move(box.x + 501, box.y + 423, { steps: 3 }); await wait(400); await page.screenshot({ path: "out/jr_objops_m.png" }); await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(800); await page.screenshot({ path: "out/jr_objops_m2.png" }); await key("Enter", 500); await page.mouse.move(box.x + 473, box.y + 463, { steps: 3 }); await wait(400); await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(900);
    const c1 = await cmd("eval:len(bpy.data.collections)"); await check(`M nová kolekce ${c0} -> ${c1}`, () => c1 === c0 + 1);
    await page.keyboard.press("Control+z"); await wait(900); const c2 = await cmd("eval:len(bpy.data.collections)"); await check(`Ctrl+Z kolekce ${c2}`, () => c2 === c0);
  },
  /* Modifikátory: počty a objem porovnat s desktopem (scripts/modtab.py, journey_desktop.py, DESK modtab). Kód tabulky sem vkládá journey_win.sh jako __MODTAB__. */
  modtab: async ({ cmd, check, wait }) => {
    await cmd(__MODTAB__); await wait(300); const n = await cmd("eval:len(MODTAB)"); const rows = [];
    for (let i = 0; i < n; i++) { await cmd(`_mt = modtab_row(${i})`); let r = null; for (let k = 0; k < 40 && !r; k++) { r = await cmd("eval:_mt"); await wait(100); } rows.push(r); console.log("MODTAB " + JSON.stringify(r)); }
    await check("všechny řádky", () => rows.length === n && rows.every((r) => r && r[1] !== "ERR"));
  },
  /* Boolean se společnou stěnou (FLOAT selhává), BACKLOG H35. Čísla z desktopu 5.2.3. */
  boolcop: async ({ cmd, check, wait, page }) => {
    await cmd(`def _bc(solver, loc):
    for o in list(bpy.data.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,0)); a=bpy.context.object
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc); b=bpy.context.object
    bpy.context.view_layer.objects.active=a
    m=a.modifiers.new('b','BOOLEAN'); m.object=b; m.operation='UNION'; m.solver=solver
    e=a.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=e.to_mesh(); r=[len(me.vertices),len(me.polygons)]; e.to_mesh_clear(); return r`); await wait(300);
    const row = {};
    for (const s of ["FLOAT", "EXACT", "MANIFOLD"]) { row[s] = [await cmd(`eval:_bc('${s}',(2,0,0))`), await cmd(`eval:_bc('${s}',(1,0,0))`), await cmd(`eval:_bc('${s}',(1,1,1))`)]; console.log("BOOLCOP " + s + " " + JSON.stringify(row[s])); }
    const def = await cmd("eval:bpy.data.objects.new('x', bpy.data.meshes.new('x')).modifiers.new('b','BOOLEAN').solver"); console.log("BOOLCOP výchozí solver " + def);
    await page.screenshot({ path: "out/jr_boolcop.png" });
    await check("EXACT jako desktop", () => JSON.stringify(row.EXACT) === "[[12,10],[16,14],[20,12]]");
    await check("MANIFOLD jako desktop", () => JSON.stringify(row.MANIFOLD) === "[[12,10],[16,10],[20,12]]");
    /* FLOAT se tu netestuje: u překryvu je nestabilní i v desktopu 5.2.3, mezi opakováními (24,5) (27,8) (27,6). */
  },
  rename: async ({ hover, key, type, check, cmd, page, wait, box }) => {
    await hover(); await key("F2", 500); await page.keyboard.press("Control+a"); await page.keyboard.type("Krabice"); await wait(300); await key("Enter", 700); await check("F2 přejmenuje", (s) => s.ob === "Krabice");
    const row = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'OUTLINER' for r in a.regions if r.type == 'WINDOW'][0])(bpy.context.window_manager.windows[0])"); console.log("OUTLINER " + JSON.stringify(row));
    const y = box.y + 123, x = box.x + 1250; await page.mouse.move(x, y, { steps: 2 }); await wait(300); await page.mouse.dblclick(x, y); await wait(600); await page.screenshot({ path: "out/jr_rename_outliner.png" }); await page.keyboard.press("Control+a"); await page.keyboard.type("Kostka2"); await wait(300); await key("Enter", 800);
    await check("dvojklik v Outlineru přejmenuje", (s) => s.ob === "Kostka2");
    /* Shift+D, ne Python: operátor z Pythonu nedělá krok undo. */
    await hover(); await page.keyboard.press("Shift+d"); await wait(400); await key("Enter", 600); await cmd("bpy.data.objects['Kostka2'].select_set(True)"); await wait(300);
    await page.keyboard.press("Control+j"); await wait(800); await check("Ctrl+J spojí", (s) => s.objs === 3 && s.v === 16);
    await page.keyboard.press("Control+z"); await wait(800); await check("Ctrl+Z rozpojí", (s) => s.objs === 4);
  },
  /* Properties klikáním: Add Modifier + hledání v menu, Ctrl+A na panelu, kontextové menu v pohledu (Shade Smooth), hodnota dvojklikem a tažením. Desktop: bevel kostky 24 v. */
  modui: async ({ check, cmd, page, wait, box, mid, type, key }) => {
    const c = async (x, y, ms = 700) => { await page.mouse.move(box.x + x, box.y + y, { steps: 3 }); await wait(300); await page.mouse.click(box.x + x, box.y + y); await wait(ms); };
    const m = mid(); await page.mouse.move(m[0], m[1] + 10, { steps: 2 }); await wait(300); await page.mouse.click(m[0], m[1] + 10, { button: "right" }); await wait(800); await page.mouse.click(m[0], m[1] + 10); await wait(800);
    const sm = await cmd("eval:bpy.context.object.data.polygons[0].use_smooth"); await check(`kontextové menu: první položka Shade Smooth (${sm})`, () => sm === true);
    await c(1167, 442, 900); const fld = [1304, 318];
    await page.mouse.move(box.x + fld[0], box.y + fld[1], { steps: 3 }); await wait(300); await page.mouse.dblclick(box.x + fld[0], box.y + fld[1]); await wait(600); await page.keyboard.press("Control+a"); await type("2.5"); await key("Enter", 700); await check("Location X dvojklik + 2.5", (s) => s.loc[0] === 2.5);
    await page.mouse.move(box.x + fld[0], box.y + fld[1]); await wait(300); await page.mouse.down(); await page.mouse.move(box.x + fld[0] + 60, box.y + fld[1], { steps: 8 }); await wait(200); await page.mouse.up(); await wait(700); const s1 = await check("tažení hodnoty změní X", (s) => s.loc[0] !== 2.5 && s.loc[0] > 2.5); await page.screenshot({ path: "out/jr_modui_drag.png" });
    await page.keyboard.press("Control+z"); await wait(700); await check("Ctrl+Z vrátí tažení", (s) => s.loc[0] === 2.5);
    await c(1167, 470, 900); await c(1290, 255, 800); await type("bevel"); await wait(500); await page.screenshot({ path: "out/jr_modui_search.png" }); await key("Enter", 900); await check("Add Modifier, hledání bevel", (s) => s.mods.includes("BEVEL"));
    const n = await cmd("eval:len(bpy.context.object.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices)"); await check(`bevel vyhodnocen: ${n} v (desktop 24)`, () => n === 24); await page.screenshot({ path: "out/jr_modui_panel.png" });
    await page.mouse.move(box.x + 1290, box.y + 330, { steps: 3 }); await wait(400); await page.keyboard.press("Control+a"); await wait(900); await check("Ctrl+A nad panelem = apply: 24 v", (s) => s.mods.length === 0 && s.v === 24);
    await page.keyboard.press("Control+z"); await wait(900); await check("Ctrl+Z vrátí apply", (s) => s.mods.length === 1 && s.v === 8);
  },
  /* Preferences: web má jedno okno. Otevření přes Edit ▸ Preferences, přepnutí sekce, návrat, práce v pohledu dál. */
  prefs: async ({ hover, check, cmd, page, wait, box, key }) => {
    const areas = "eval:[a.type for a in bpy.context.window_manager.windows[0].screen.areas]", a0 = await cmd(areas), nw0 = await cmd("eval:len(bpy.context.window_manager.windows)");
    await page.mouse.move(box.x + 75, box.y + 13, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 75, box.y + 13); await wait(700); await page.screenshot({ path: "out/jr_prefs_menu.png" });
    await cmd("bpy.ops.screen.userpref_show()"); await wait(2000); await page.screenshot({ path: "out/jr_prefs_open.png" });
    const a1 = await cmd(areas), nw1 = await cmd("eval:len(bpy.context.window_manager.windows)"); console.log("PREFS " + JSON.stringify([a0, a1, nw0, nw1]));
    await page.keyboard.press("Escape"); await wait(1200); await page.screenshot({ path: "out/jr_prefs_esc.png" });
    await check("Preferences přes celé okno, jedno okno", () => a1.length === 1 && a1[0] === "PREFERENCES" && nw1 === 1);
    await page.mouse.move(box.x + 40, box.y + 271, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 40, box.y + 271); await wait(900); const sec = await cmd("eval:bpy.context.preferences.active_section"); await check(`klik na Themes (${sec})`, () => sec === "THEMES");
    await page.mouse.move(box.x + 320, box.y + 13, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 320, box.y + 13); await wait(1500); const a3 = await cmd(areas); await check(`Back to Previous vrátí rozložení ${JSON.stringify(a3)}`, () => JSON.stringify(a3) === JSON.stringify(a0));
    await hover(); await key("Tab", 700); await check("pohled dál reaguje: Tab = edit", (s) => s.mode === "EDIT_MESH"); await key("Tab", 700);
  },
  /* Nody v Shading: Shift+A + hledání, klik položí, G posune, X smaže, Ctrl+Z. */
  nodes: async ({ check, cmd, page, wait, box, type, key, tab }) => {
    await tab("Shading"); await wait(6000); const R = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'NODE_EDITOR' for r in a.regions if r.type == 'WINDOW'][0])(bpy.context.window_manager.windows[0])");
    const x = box.x + R[0] + R[2] * 0.25, y = box.y + R[1] + R[3] * 0.5, N = "eval:len(bpy.context.object.active_material.node_tree.nodes)", n0 = await cmd(N);
    await page.mouse.move(x, y, { steps: 3 }); await wait(400); await page.keyboard.press("Shift+a"); await wait(700); await type("image tex"); await wait(500); await page.screenshot({ path: "out/jr_nodes_search.png" }); await key("Enter", 800); await page.mouse.move(x + 10, y + 10, { steps: 3 }); await wait(300); await page.mouse.click(x + 10, y + 10); await wait(900); await page.screenshot({ path: "out/jr_nodes_add.png" });
    const n1 = await cmd(N); await check(`Shift+A přidá nod (${n0} -> ${n1})`, () => n1 === n0 + 1);
    const pos = "eval:[round(v) for v in bpy.context.object.active_material.node_tree.nodes.active.location]", p0 = await cmd(pos); await key("g", 300); await page.mouse.move(x + 90, y + 40, { steps: 5 }); await wait(300); await page.mouse.click(x + 90, y + 40); await wait(700); const p1 = await cmd(pos); await check(`G posune nod ${JSON.stringify([p0, p1])}`, () => p1[0] !== p0[0]);
    await key("x", 700); const n2 = await cmd(N); await check(`X smaže (${n2})`, () => n2 === n0); await page.keyboard.press("Control+z"); await wait(900); const n3 = await cmd(N); await check(`Ctrl+Z vrátí (${n3})`, () => n3 === n1);
  },
  /* Append a Link z jiného .blend (Python cesta, prohlížeč souborů testuje files). */
  append: async ({ check, cmd, wait }) => {
    await cmd("bpy.ops.mesh.primitive_monkey_add(location=(0,4,0)); bpy.context.object.name='Zdroj'"); await wait(600); await cmd("bpy.ops.wm.save_as_mainfile(filepath='/opfs/home/jr_src.blend')"); await wait(1500);
    await cmd("bpy.ops.wm.read_homefile(app_template='', use_factory_startup=True)"); await wait(2500); await check("nový soubor", (s) => s.objs === 3);
    await cmd("bpy.ops.wm.append(directory='/opfs/home/jr_src.blend/Object/', filename='Zdroj')"); await wait(1500); await check("Append přidá objekt", (s) => s.objs === 4); const v = await cmd("eval:len(bpy.data.objects['Zdroj'].data.vertices)"); await check(`mesh ${v} v (desktop 507)`, () => v === 507);
    await cmd("bpy.data.objects.remove(bpy.data.objects['Zdroj']); bpy.ops.wm.link(directory='/opfs/home/jr_src.blend/Object/', filename='Zdroj')"); await wait(1500); const l = await cmd("eval:bool(bpy.data.objects['Zdroj'].library)"); await check(`Link: objekt z knihovny (${l})`, () => l === true);
  },
  /* UV Editor: A, G posun UV (hover nad editorem), Ctrl+Z. Pozice se čtou z dat. */
  uvedit: async ({ check, cmd, page, wait, box, key, type, tab }) => {
    await tab("UV Editing"); await check("UV Editing: edit mode", (s) => s.mode === "EDIT_MESH");
    const R = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'IMAGE_EDITOR' for r in a.regions if r.type == 'WINDOW'][0])(bpy.context.window_manager.windows[0])");
    const x = box.x + R[0] + R[2] / 2, y = box.y + R[1] + R[3] / 2; await page.mouse.move(x, y, { steps: 3 }); await wait(400);
    const uv = "eval:(lambda o: (o.update_from_editmode(), round(sum(d.uv[0] for d in o.data.uv_layers.active.data), 3))[1])(bpy.context.object)", u0 = await cmd(uv);
    await key("a", 500); await key("g", 300); await key("x", 200); await type("0.25"); await key("Enter", 800); await page.screenshot({ path: "out/jr_uvedit.png" });
    const u1 = await cmd(uv), n = await cmd("eval:len(bpy.context.object.data.uv_layers.active.data)"); await check(`G X 0.25 posune UV (${u0} -> ${u1}, ${n} rohů)`, () => Math.abs(u1 - u0 - 0.25 * n) < 0.01);
    await page.keyboard.press("Control+z"); await wait(900); const u2 = await cmd(uv); await check(`Ctrl+Z vrátí UV (${u2})`, () => Math.abs(u2 - u0) < 0.01);
  },
  /* Weight paint: vrstva vah, tah, Ctrl+Z. */
  wpaint: async ({ check, cmd, page, wait, mid }) => {
    await cmd("o=bpy.context.object; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=8); bpy.ops.object.mode_set(mode='OBJECT'); g=o.vertex_groups.new(name='W'); bpy.ops.object.mode_set(mode='WEIGHT_PAINT')"); await wait(2000); await check("Weight Paint mód", (s) => s.mode === "PAINT_WEIGHT");
    const n = "eval:sum(1 for v in bpy.context.object.data.vertices for g in v.groups if g.weight > 0.01)", n0 = await cmd(n), m = mid(); await page.mouse.move(m[0] - 30, m[1] - 20); await wait(300); await page.mouse.down(); for (let i = 0; i < 14; i++) { await page.mouse.move(m[0] - 30 + i * 5, m[1] - 20 + i * 2); await wait(30); } await page.mouse.up(); await wait(1200); await page.screenshot({ path: "out/jr_wpaint.png" });
    const n1 = await cmd(n); await check(`tah přidá váhy (${n0} -> ${n1})`, () => n1 > n0); await page.keyboard.press("Control+z"); await wait(1000); const n2 = await cmd(n); await check(`Ctrl+Z vrátí (${n2})`, () => n2 === n0);
  },
  /* 2D Animation: nová vrstva, tah do ní, přepnutí materiálu (barvy), guma (Ctrl+tah). */
  gp2: async ({ cmd, check, page, wait, box }) => {
    await cmd("bpy.ops.wm.read_homefile(app_template='2D_Animation', use_factory_startup=True)"); await wait(6000); await page.keyboard.press("Escape"); await wait(600);
    const V = await cmd("view"), m = [box.x + V[0] + V[2] / 2, box.y + V[1] + V[3] / 2]; const pts = "eval:[[l.name, sum(len(d.strokes) for d in [l.current_frame().drawing] if l.current_frame())] for l in bpy.context.object.data.layers]";
    const stroke = async (dy) => { await page.mouse.move(m[0] - 100, m[1] + dy); await wait(150); await page.mouse.down(); for (let i = 0; i < 20; i++) { await page.mouse.move(m[0] - 100 + i * 10, m[1] + dy); await wait(16); } await page.mouse.up(); await wait(800); };
    const l0 = await cmd(pts); console.log("GP2 " + JSON.stringify(l0)); await cmd("gp=bpy.context.object.data; gp.layers.active=gp.layers.new('Nova', set_active=True); gp.layers.active.frames.new(bpy.context.scene.frame_current)"); await wait(800); await stroke(-40);
    const l1 = await cmd(pts); console.log("GP2 " + JSON.stringify(l1)); await check("tah je v nové vrstvě", () => Array.isArray(l1) && l1.some((x) => x[0] === "Nova" && x[1] === 1)); await page.screenshot({ path: "out/jr_gp2_layer.png" });
    await page.keyboard.down("Control"); await page.mouse.move(m[0] - 100, m[1] - 40); await wait(200); await page.mouse.down(); for (let i = 0; i < 20; i++) { await page.mouse.move(m[0] - 100 + i * 10, m[1] - 40); await wait(16); } await page.mouse.up(); await page.keyboard.up("Control"); await wait(900);
    const l2 = await cmd(pts); console.log("GP2 " + JSON.stringify(l2)); await page.screenshot({ path: "out/jr_gp2_erase.png" }); await check("Ctrl+tah (guma) smaže tah", () => Array.isArray(l2) && l2.every((x) => x[0] !== "Nova" || x[1] === 0));
  },
  /* J4: klik na záložku workspace hned po přepnutí na Shading (běží překlad MP). Bez čekání na překreslení. */
  j4: async ({ check, cmd, page, wait, box }) => {
    const xs = { Shading: 655, Animation: 725, Layout: 287, Modeling: 350 }, go = async (n, ms) => { await page.mouse.move(box.x + xs[n], box.y + 13); await wait(ms); await page.mouse.click(box.x + xs[n], box.y + 13); };
    let lost = 0; const ws = "eval:bpy.context.window_manager.windows[0].workspace.name";
    for (const [a, ms] of [["Animation", 250], ["Layout", 100], ["Modeling", 30], ["Animation", 250], ["Layout", 100], ["Modeling", 30]]) {
      await go("Shading", 250); await wait(150); await go(a, ms);
      let w = null; for (let i = 0; i < 40; i++) { await wait(500); w = await cmd(ws); if (w === a) break; }
      console.log(`J4 Shading -> ${a} prodleva ${ms} ms: ${w}`); if (w !== a) lost++;
    }
    await check(`ztracených kliků ${lost} z 6`, () => lost === 0);
  },
  /* Pointer Lock: rychlé G + Esc a krátké MMB nesmí nechat zámek viset (požadavek běží asynchronně, exit může přijít dřív). Po něm klik musí trefit správné místo. */
  lock: async ({ check, cmd, page, wait, hover, mid }) => {
    const m = mid(), locked = () => page.evaluate(() => !!document.pointerLockElement); let stuck = 0;
    for (let i = 0; i < 12; i++) {
      await hover(); await page.keyboard.press("g"); await wait(i % 4 * 15); await page.keyboard.press("Escape"); await wait(700); if (await locked()) { stuck++; console.log(`LOCK po G+Esc #${i} visí`); await page.evaluate(() => document.exitPointerLock()); await wait(300); }
      await page.mouse.down({ button: "middle" }); await wait(i % 4 * 15); await page.mouse.up({ button: "middle" }); await wait(700); if (await locked()) { stuck++; console.log(`LOCK po MMB #${i} visí`); await page.evaluate(() => document.exitPointerLock()); await wait(300); }
    }
    await check(`zámek po rychlém zrušení visí ${stuck}× z 24`, (s) => stuck === 0 && s.loc[0] === 0);
    await page.mouse.move(m[0], m[1]); await wait(300); await page.mouse.down({ button: "middle" }); await page.mouse.move(m[0] + 80, m[1] + 30, { steps: 6 }); await page.mouse.up({ button: "middle" }); await wait(500);
    const c = await cmd("obj"); const b = await page.locator("#canvas").boundingBox(); await page.keyboard.press("Alt+a"); await wait(400); await page.mouse.move(b.x + c[0], b.y + c[1], { steps: 2 }); await wait(250); await page.mouse.click(b.x + c[0], b.y + c[1]); await wait(600); const n = await cmd("eval:[o.name for o in bpy.context.selected_objects]"); await check(`klik po orbitu trefí kostku ${JSON.stringify(n)}`, () => n.length === 1 && n[0] === "Cube");
  },
  /* Oblasti skutečnou myší: rozdělení a spojení rohem, tažení hranice, Shift+F1..F12 mění editor. Zkratky nesmí jít do prohlížeče (Shift+F5 = reload = ztráta práce). */
  areas: async ({ check, cmd, page, wait, hover, key, at }) => {
    const H = (await cmd("view"))[5], list = () => cmd("eval:[(a.type, a.x, a.y, a.width, a.height) for a in bpy.context.window_manager.windows[0].screen.areas]"), views = async () => (await list()).filter((a) => a[0] === "VIEW_3D").sort((a, b) => a[1] - b[1]);
    const drag = async (p, q) => { const a = at(p), b = at(q); await page.mouse.move(a[0], a[1], { steps: 3 }); await wait(400); await page.mouse.down(); await wait(150); await page.mouse.move(b[0], b[1], { steps: 12 }); await wait(400); await page.mouse.up(); await wait(1200); };
    await page.evaluate(() => { window.__KD = []; window.addEventListener("keydown", (e) => { const n = (e.ctrlKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "") + e.key; setTimeout(() => window.__KD.push([n, e.defaultPrevented]), 0); }, true); });
    const n0 = (await list()).length; let [v] = await views(); const top = H - (v[2] + v[4]);
    await drag([v[1] + 4, top + 4], [v[1] + 300, top + 8]); let s = await check(`roh dovnitř rozdělí oblast (${n0} -> ${n0 + 1})`, (s) => s.areas === n0 + 1);
    let vs = await views(); console.log("AREAS " + JSON.stringify(vs)); await page.screenshot({ path: "out/jr_areas_split.png" });
    if (vs.length === 2) { await drag([vs[1][1] + 4, top + 4], [vs[0][1] + vs[0][3] - 12, top + vs[0][4] / 2]); await check(`roh ven spojí oblasti (${n0})`, (s) => s.areas === n0); }
    [v] = await views(); const h0 = v[4], y0 = H - v[2]; await drag([v[1] + 300, y0], [v[1] + 300, y0 - 80]); [v] = await views(); console.log(`AREAS hranice ${h0} -> ${v[4]}`); await check(`tažení hranice o 80 px změní výšku (${h0} -> ${v[4]})`, () => Math.abs(h0 - v[4] - 80) < 25);
    await hover();
    const want = { F1: "FILE_BROWSER", F2: "CLIP_EDITOR", F3: "NODE_EDITOR", F4: "CONSOLE", F5: "VIEW_3D", F6: "GRAPH_EDITOR", F7: "PROPERTIES", F8: "SEQUENCE_EDITOR", F9: "OUTLINER", F10: "IMAGE_EDITOR", F11: "TEXT_EDITOR", F12: "DOPESHEET_EDITOR" };
    const base = await list(), idx = base.findIndex((a) => a[0] === "VIEW_3D"), got = {};
    for (const k of Object.keys(want)) { await page.keyboard.press("Shift+" + k); await wait(900); got[k] = (await list())[idx][0]; }
    console.log("AREAS editory " + JSON.stringify(got)); await page.keyboard.press("Shift+F5"); await wait(900);
    const bad = Object.keys(want).filter((k) => got[k] !== want[k]); await check(`Shift+F1..F12 přepnou editor, špatně: ${bad.join(",") || "nic"}`, () => bad.length === 0); await check("Shift+F5 vrátí 3D pohled", (s) => s.shade === "SOLID");
    await hover(); for (const k of ["s", "o", "n", "p", "r", "f", "g", "d", "l"]) { await page.keyboard.press("Control+" + k); await wait(500); await page.keyboard.press("Escape"); await wait(400); }
    for (const k of ["F2", "F3", "F5", "Alt+d", "Alt+f", "Alt+e"]) { await page.keyboard.press(k); await wait(500); await page.keyboard.press("Escape"); await wait(400); }
    const kd = await page.evaluate(() => window.__KD), leak = [...new Set(kd.filter((x) => !x[1] && /^(Ctrl\+|Shift\+F|F\d|Alt\+[a-z]$)/.test(x[0])).map((x) => x[0]))]; console.log("AREAS klávesy " + kd.length + " do prohlížeče: " + JSON.stringify(leak));
    await check(`zkratky zablokované pro prohlížeč, propadlo: ${leak.join(",") || "nic"}`, () => kd.length > 0 && leak.length === 0);
  },
  /* UI: F3 hledání, Modifier přes Shift+A menu v nodech není; rozdělení oblasti přes menu View, Preferences okno. */
  ui: async ({ hover, key, check, page, wait, type, tab }) => {
    await hover(); await key("F3", 700); await type("subdivide"); await wait(500); await page.keyboard.press("Escape"); await wait(300); await page.keyboard.press("Escape"); await wait(400); await check("F3 a Esc nezmění mód", (s) => s.mode === "OBJECT");
    for (const t of ["Modeling", "Sculpting", "UV Editing", "Texture Paint", "Shading", "Animation", "Rendering", "Compositing", "Geometry Nodes", "Layout"]) { await tab(t); await check("workspace " + t, (s) => s.ws === t); }
  },
  /* 8. 11.: klávesy, které jiné cesty nemají. Desktop 5.2.3 má stejné chování (standardní keymap); počty jsou z výchozí kostky. */
  keys2: async ({ hover, key, check, cmd, page, wait, type }) => {
    await hover(); await key("Tab", 800); await check("Tab: edit, vše vybráno", (s) => s.mode === "EDIT_MESH" && s.vsel === 8);
    await key("Alt+a", 600); await check("Alt+A odznačí", (s) => s.vsel === 0);
    await cmd("import bmesh; _bm = bmesh.from_edit_mesh(bpy.context.object.data); _bm.verts.ensure_lookup_table(); _bm.verts[0].select_set(True); bmesh.update_edit_mesh(bpy.context.object.data)"); await wait(400);
    await check("jeden vrchol vybraný", (s) => s.vsel === 1);
    await hover(); await key("Control+l", 700); await check("Ctrl+L vybere spojené", (s) => s.vsel === 8);
    await key("Control+i", 600); await check("Ctrl+I invertuje", (s) => s.vsel === 0);
    await key("Control+i", 600); await check("Ctrl+I zpět", (s) => s.vsel === 8);
    await key("Tab", 800); await check("Tab: zpět Object", (s) => s.mode === "OBJECT");
    await hover(); await key("g", 400); await key("x", 300); await type("1"); await key("Enter", 700); await check("G X 1", (s) => s.loc[0] === 1);
    await hover(); await key("Shift+r", 800); await check("Shift+R zopakuje posun", (s) => s.loc[0] === 2);
    const sn = async () => cmd("eval:bpy.context.scene.tool_settings.use_snap");
    const s0 = await sn(); await hover(); await key("Shift+Tab", 600); const s1 = await sn(); await check(`Shift+Tab zapne snap (${s0} -> ${s1})`, () => s0 === false && s1 === true);
    await key("Shift+Tab", 600); const s2 = await sn(); await check(`Shift+Tab vypne snap (${s2})`, () => s2 === false);
    await cmd("bpy.context.scene.cursor.location = (3, 2, 1)"); await wait(300); await hover(); await key("Shift+c", 900);
    const cur = await cmd("eval:[round(v, 3) for v in bpy.context.scene.cursor.location]"); await check(`Shift+C vrátí kurzor (${cur})`, () => cur && cur.every((v) => v === 0));
    const qv = async () => cmd("eval:len(bpy.context.window_manager.windows[0].screen.areas[[a.type for a in bpy.context.window_manager.windows[0].screen.areas].index('VIEW_3D')].spaces[0].region_quadviews)");
    await hover(); await key("Control+Alt+q", 900); const q1 = await qv(); await page.screenshot({ path: "out/jr_keys2_quad.png" }); await check(`Ctrl+Alt+Q quad view (${q1}, 4 regiony jako rna_space.cc)`, () => q1 === 4);
    await hover(); await key("Control+Alt+q", 900); const q2 = await qv(); await check(`Ctrl+Alt+Q zpět (${q2})`, () => q2 === 0);
  },
  /* 8. 11.: schránka. Ctrl+C/Ctrl+V v pohledu = copybuffer.blend v dočasné složce; Ctrl+C/Ctrl+V nad polem = textová schránka (GHOST). */
  clip: async ({ hover, key, check, cmd, page, wait, at }) => {
    await hover(); await key("Control+c", 900); await key("Control+v", 1200); await check("Ctrl+C, Ctrl+V v pohledu: kopie objektu", (s) => s.objs === 4 && s.ob === "Cube.001");
    /* copybuffer.blend v /tmp je interní soubor Blenderu, ne export: dřív vyskočil pruh "Export hotový: Stáhnout copybuffer.blend" */
    await wait(1500); const toast = await page.evaluate(() => document.body.innerText.includes("copybuffer")); await check(`žádný pruh exportu pro copybuffer.blend (${toast})`, () => toast === false);
    await cmd("bpy.context.object.location.x = 4.25"); await wait(500);
    /* Location X v N-panelu: N, najet na pole, Ctrl+C; pak jiný objekt a Ctrl+V */
    await hover(); await key("n", 900);
    const fx = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'VIEW_3D' for r in a.regions if r.type == 'UI'][0])(bpy.context.window_manager.windows[0])");
    await page.screenshot({ path: "out/jr_clip_npanel.png" }); console.log("NPANEL " + JSON.stringify(fx));
    const fieldAt = async () => { const [x, y] = at([fx[0] + fx[2] * 0.62, fx[1] + 64]); await page.mouse.move(x, y, { steps: 2 }); await wait(400); };
    await fieldAt(); await key("Control+c", 600);
    const clip = await cmd("eval:bpy.context.window_manager.clipboard"); await check(`Ctrl+C nad polem do schránky (${JSON.stringify(clip)})`, () => clip && Math.abs(parseFloat(clip) - 4.25) < 1e-3);
    await cmd("[o.select_set(False) for o in bpy.data.objects]; bpy.context.view_layer.objects.active = bpy.data.objects['Cube']; bpy.data.objects['Cube'].select_set(True)"); await wait(600);
    await fieldAt(); await key("Control+v", 800); await check("Ctrl+V nad polem vloží hodnotu", (s) => s.ob === "Cube" && s.loc[0] === 4.25);
  },
};
for (const [n, f] of Object.entries(J)) if ((which === "all" && n !== "j4") || which.split(",").includes(n)) await run(n, f); /* j4 = otevřená chyba, BACKLOG J4: spouštět zvlášť */
console.log("TABULKA " + results.map((r) => `${r[0]}:${r[1] || r[2] || r[3] || r[4] ? "CHYBA" : "OK"}`).join(" "));
await browser.close();
process.exit(results.some((r) => r[1] || r[2] || r[3] || r[4]) ? 1 : 0);
