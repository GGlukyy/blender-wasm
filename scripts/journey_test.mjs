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
    /* J4 pokus: J4DBL=ms nastaví dobu dvojkliku (je-li příčinou dvojklik, při 50 ms ztráty zmizí) */
    if (process.env.J4DBL) { await cmd(`bpy.context.preferences.inputs.mouse_double_click_time = ${+process.env.J4DBL}`); await wait(300); }
    /* J4EV=1: výpis událostí Blenderu (LEFTMOUSE PRESS / DBL_CLICK) pro každý pokus */
    let evs = []; if (process.env.J4EV) { await cmd("bpy.app.debug_events = True"); page.on("console", (m) => { const t = m.text(); if (/LEFTMOUSE/.test(t)) evs.push(t.replace(/\s+/g, " ").slice(0, 160)); }); }
    for (const [a, ms] of [["Animation", 250], ["Layout", 100], ["Modeling", 30], ["Animation", 250], ["Layout", 100], ["Modeling", 30]]) {
      await go("Shading", 250); await wait(150); await go(a, ms);
      let w = null; for (let i = 0; i < 40; i++) { await wait(500); w = await cmd(ws); if (w === a) break; }
      console.log(`J4 Shading -> ${a} prodleva ${ms} ms: ${w}`); if (w !== a) lost++;
      if (process.env.J4EV) { console.log("J4EV " + evs.join(" || ")); evs = []; }
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
  /* 8. 11.: české znaky: psaní do pole (F2) a soubor s diakritikou v OPFS (uložit, otevřít, výpis). */
  unicode: async ({ hover, key, check, cmd, page, wait }) => {
    await hover(); await key("F2", 600); await page.keyboard.press("Control+a");
    /* česká klávesnice (Windows/Mac): keydown s key "č" a code podle polohy (č = Digit4); type() u ne-US znaků posílá jen insertText bez klávesy */
    const cdp = await page.context().newCDPSession(page), CZ = { "ě": "Digit2", "š": "Digit3", "č": "Digit4", "ř": "Digit5", "ž": "Digit6", "ý": "Digit7", "á": "Digit8", "í": "Digit9", "é": "Digit0", "ú": "BracketLeft", "ů": "Semicolon", " ": "Space" };
    for (const c of "Kočička řežů") { const code = CZ[c] || "Key" + c.toUpperCase(); await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: c, code, text: c, unmodifiedText: c }); await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: c, code }); await wait(120); }
    await wait(400); await key("Enter", 800);
    await check("F2 + česká slova", (s) => s.ob === "Kočička řežů");
    const P = "/opfs/home/židle ěščř.blend";
    await cmd(`bpy.ops.wm.save_as_mainfile(filepath=${JSON.stringify(P)})`); await wait(1500);
    await check("uložit do souboru s diakritikou", (s) => s.file === P);
    const ls = await cmd("eval:[n for n in os.listdir('/opfs/home') if n.endswith('.blend')]"); await check(`výpis /opfs/home (${JSON.stringify(ls)})`, () => ls && ls.includes("židle ěščř.blend"));
    await cmd("bpy.ops.mesh.primitive_monkey_add()"); await wait(800); await check("přidaná opice", (s) => s.objs === 4);
    await cmd(`bpy.ops.wm.open_mainfile(filepath=${JSON.stringify(P)})`); await wait(3000);
    await check("otevřít soubor s diakritikou: 3 objekty, jméno", (s) => s.objs === 3 && s.file === P);
    const nm = await cmd("eval:sorted(o.name for o in bpy.data.objects)"); await check(`jméno objektu přežilo uložení (${JSON.stringify(nm)})`, () => nm && nm.includes("Kočička řežů"));
  },
  /* 8. 11.: výrazy v číselných polích (Python): 1+2, jednotky 10cm, 90 ve stupních, 2*pi. Desktop: stejné hodnoty. */
  expr: async ({ hover, key, check, cmd, page, wait, at }) => {
    await hover(); await key("n", 900);
    const fx = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'VIEW_3D' for r in a.regions if r.type == 'UI'][0])(bpy.context.window_manager.windows[0])");
    const put = async (dy, txt) => { const [x, y] = at([fx[0] + fx[2] * 0.62, fx[1] + dy]); await page.mouse.move(x, y, { steps: 2 }); await wait(300); await page.mouse.dblclick(x, y); await wait(500);
      await page.keyboard.press("Control+a"); await page.keyboard.type(txt, { delay: 60 }); await wait(300); await page.keyboard.press("Enter"); await wait(800); };
    await put(64, "1+2"); await check("Location X = 1+2", (s) => s.loc[0] === 3);
    await put(84, "10cm"); await check("Location Y = 10cm", (s) => s.loc[1] === 0.1);
    await put(104, "-2*0.25"); await check("Location Z = -2*0.25", (s) => s.loc[2] === -0.5);
    await put(146, "90"); await check("Rotation X = 90° (1.571 rad)", (s) => s.rot[0] === 1.571);
    await put(250, "2*pi/pi"); await check("Scale X = 2*pi/pi", (s) => s.scale[0] === 2);
    await page.screenshot({ path: "out/jr_expr.png" });
  },
  /* 8. 11.: soubor přetažený na plátno. Dřív žádný handler: prohlížeč soubor otevřel místo Blenderu (stránka pryč).
   * Desktop 5.2.3: .obj se importuje (FileHandler), .blend se otevře. */
  dropfile: async ({ check, cmd, page, wait }) => {
    const drop = (name, bytes) => page.evaluate(([n, b]) => {
      const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(b)], n));
      const c = document.getElementById("canvas"), r = c.getBoundingClientRect(), o = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
      c.dispatchEvent(new DragEvent("dragenter", o)); const over = new DragEvent("dragover", o); c.dispatchEvent(over);
      c.dispatchEvent(new DragEvent("drop", o)); return over.defaultPrevented; }, [name, [...bytes]]);
    const obj = Buffer.from("o Tri\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
    const prevented = await drop("trojuhelnik.obj", obj); await wait(2500);
    await check(`dragover zrušen (prohlížeč soubor neotevře): ${prevented}`, () => prevented === true);
    await check("přetažený .obj se importuje", (s) => s.objs === 4 && s.ob === "Tri" && s.v === 3);
    await cmd("bpy.ops.wm.save_as_mainfile(filepath='/tmp/drop_src.blend')"); await wait(1200);
    const blend = await page.evaluate(() => [...window.Module.FS.readFile("/tmp/drop_src.blend")]);
    await cmd("bpy.ops.wm.read_homefile(use_factory_startup=True); bpy.ops.wm.save_as_mainfile(filepath='/tmp/empty.blend')"); await wait(2000);
    await check("nová scéna (3 objekty)", (s) => s.objs === 3);
    await drop("s_trojuhelnikem.blend", Buffer.from(blend)); await wait(3500);
    await check("přetažený .blend se otevře", (s) => s.objs === 4 && s.file === "/uploads/s_trojuhelnikem.blend");
  },
  /* 8. 11.: Safari dialog Open ("Drag & drop a folder"): přetažený SOUBOR dřív hlásil "Please drop a folder, not a file". Jen webkit_sim (Chrome má jiný dialog). */
  dropmodal: async ({ check, cmd, page, wait }) => {
    if (!/webkit_sim=1/.test(Q)) { await check("jen s webkit_sim=1 (Safari dialog)", () => true); return; }
    await cmd("bpy.ops.mesh.primitive_monkey_add(location=(0, 3, 0)); bpy.ops.wm.save_as_mainfile(filepath='/tmp/dm_src.blend')"); await wait(1500);
    const blend = await page.evaluate(() => [...window.Module.FS.readFile("/tmp/dm_src.blend")]);
    await cmd("bpy.ops.wm.read_homefile(use_factory_startup=True); bpy.ops.wm.save_as_mainfile(filepath='/tmp/dm_empty.blend')"); await wait(2000);
    await page.evaluate(() => { window.__blenderFileOpenHook(); }); await wait(800);
    const zone = await page.evaluate(() => !!document.getElementById("localdir-dropzone")); await check(`Safari dialog Open je vidět (${zone})`, () => zone);
    await page.evaluate((b) => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(b)], "opice.blend"));
      document.getElementById("localdir-dropzone").dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true })); }, blend);
    await wait(3500);
    await check("přetažený .blend v dialogu se otevře", (s) => s.objs === 4 && s.file === "/uploads/opice.blend");
  },
  /* 8. 11.: Zpět v prohlížeči (iPad: tah od levého okraje, Mac: dva prsty doprava) s neuloženou scénou nesmí Blender zavřít bez dotazu. */
  back: async ({ check, cmd, page, wait, hover, key }) => {
    await hover(); await key("g", 300); await key("x", 200); await key("2", 200); await key("Enter", 1200);
    await check("scéna změněná (G X 2)", (s) => s.loc[0] === 2);
    let dlg = ""; page.once("dialog", (d) => { dlg = d.type() + ": " + d.message(); d.dismiss().catch(() => {}); });
    const url0 = page.url(); await page.goBack({ timeout: 5000 }).catch(() => {}); await wait(2500);
    await check(`Zpět se zeptá (${dlg})`, () => dlg.startsWith("confirm"));
    const alive = await page.evaluate(() => !!(window.Module && window.Module.FS)).catch(() => false);
    await check(`po „Zůstat" stránka s Blenderem zůstala (${alive})`, (s) => alive && s.loc[0] === 2);
  },
  /* 8. 11.: web má jedno plátno (GHOST createWindow vrací nullptr pro další okna). Window ▸ New Window, okno z oblasti, fullscreen: nesmí spadnout, Blender dál reaguje. */
  windows: async ({ check, cmd, page, wait, hover, key }) => {
    const nwin = "eval:len(bpy.context.window_manager.windows)";
    await cmd("bpy.ops.wm.window_new()"); await wait(1500); const n1 = await cmd(nwin); await page.screenshot({ path: "out/jr_windows_new.png" });
    await check(`Window ▸ New Window nespadne (oken ${n1})`, (s) => s.objs === 3 && n1 !== null);
    await hover(); await key("F3", 700); await page.keyboard.type("duplicate area into new window", { delay: 30 }); await wait(700); await key("Enter", 1500);
    const n2 = await cmd(nwin); await page.screenshot({ path: "out/jr_windows_dup.png" }); await check(`Duplicate Area into New Window nespadne (oken ${n2})`, (s) => s.objs === 3);
    await hover(); await key("Control+Alt+f", 1200); const n3 = await cmd(nwin); await check(`Toggle Window Fullscreen nespadne (oken ${n3})`, (s) => s.objs === 3);
    await hover(); await key("g", 300); await key("x", 200); await key("1", 200); await key("Enter", 900); await check("pak G X 1 funguje", (s) => s.loc[0] === 1);
  },
  /* F1 (8. 11.): Window ▸ Toggle Window Fullscreen (výchozí keymap nemá zkratku, jde přes menu / F3). Desktop přepne okno na celou obrazovku,
   * web = fullscreen stránky (prohlížeč chce aktivaci uživatele: Enter v hledání ji dá); podruhé zpět. */
  fullscreen: async ({ check, page, wait, hover, key }) => {
    const fs = () => page.evaluate(() => !!(document.fullscreenElement || document.webkitFullscreenElement));
    const toggle = async () => { await hover(); await key("F3", 700); await page.keyboard.type("toggle window fullscreen", { delay: 30 }); await wait(700); await key("Enter", 1800); };
    const f0 = await fs(); await toggle(); const f1 = await fs(); await page.screenshot({ path: "out/jr_fullscreen_on.png" });
    await check(`Toggle Window Fullscreen zapne celou obrazovku (${f0} -> ${f1})`, () => !f0 && f1);
    await toggle(); const f2 = await fs(); await check(`podruhé ji vypne (${f2})`, () => !f2);
    await hover(); await key("g", 300); await key("x", 200); await key("1", 200); await key("Enter", 900); await check("pak G X 1 funguje", (s) => s.loc[0] === 1);
  },
  /* 8. 11.: navigační gizmo vpravo nahoře myší (na iPadu bez numpadu hlavní cesta k pohledům): kamera, ortho, osa Z, tažení ruky / lupy / koule. */
  gizmo: async ({ check, cmd, page, wait, box }) => {
    const r3 = "eval:(lambda r: [r.view_perspective, round(r.view_distance, 3), [round(v, 3) for v in r.view_location], [round(v, 3) for v in r.view_rotation]])([a for a in bpy.context.window_manager.windows[0].screen.areas if a.type == 'VIEW_3D'][0].spaces[0].region_3d)";
    const click = async (x, y) => { await page.mouse.move(box.x + x, box.y + y, { steps: 3 }); await wait(300); await page.mouse.click(box.x + x, box.y + y); await wait(900); };
    const drag = async (x, y, dx, dy) => { await page.mouse.move(box.x + x, box.y + y, { steps: 3 }); await wait(300); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + x + dx * i / 10, box.y + y + dy * i / 10); await wait(30); } await page.mouse.up(); await wait(800); };
    const v0 = await cmd(r3); console.log("R3 start " + JSON.stringify(v0));
    await click(1126, 246); const v1 = await cmd(r3); await page.screenshot({ path: "out/jr_gizmo_cam.png" }); await check(`ikona kamery = pohled kamery (${v1 && v1[0]})`, () => v1 && v1[0] === "CAMERA");
    await click(1126, 246); const v2 = await cmd(r3); await check(`podruhé zpět (${v2 && v2[0]})`, () => v2 && v2[0] === "PERSP");
    await click(1126, 277); const v3 = await cmd(r3); await check(`ikona mřížky = ortho (${v3 && v3[0]})`, () => v3 && v3[0] === "ORTHO");
    await click(1126, 277); const v4 = await cmd(r3); await check(`podruhé perspektiva (${v4 && v4[0]})`, () => v4 && v4[0] === "PERSP");
    await click(1097, 99); const v5 = await cmd(r3); await page.screenshot({ path: "out/jr_gizmo_top.png" });
    await check(`klik na osu Z = pohled shora (${JSON.stringify(v5 && v5[3])})`, () => v5 && Math.abs(Math.abs(v5[3][0]) - 1) < 0.01);
    await drag(1126, 217, -150, 60); const v6 = await cmd(r3); await check(`tažení ruky posune pohled (${JSON.stringify(v6 && v6[2])})`, () => v6 && JSON.stringify(v6[2]) !== JSON.stringify(v5[2]));
    await drag(1126, 187, 0, 80); const v7 = await cmd(r3); await check(`tažení lupy změní vzdálenost (${v6 && v6[1]} -> ${v7 && v7[1]})`, () => v7 && v7[1] !== v6[1]);
    await drag(1100, 125, -60, 30); const v8 = await cmd(r3); await check(`tažení koule otočí pohled (${JSON.stringify(v8 && v8[3])})`, () => v8 && JSON.stringify(v8[3]) !== JSON.stringify(v7[3]));
  },
  /* 8. 11.: skrýt/odkrýt, přesun do nové kolekce přes M (menu + pole se jménem), Ctrl+Z. Desktop: H skryje, Alt+H odkryje a vybere, M ▸ New Collection. */
  hidecol: async ({ check, cmd, page, wait, hover, key, mid }) => {
    const st = "eval:(lambda o: [o.hide_get(), o.select_get(), [c.name for c in o.users_collection], sorted(c.name for c in bpy.data.collections)])(bpy.data.objects['Cube'])";
    await hover(); await key("h", 700); const a = await cmd(st); await check(`H skryje kostku (${JSON.stringify(a)})`, () => a && a[0] === true);
    await hover(); await key("Alt+h", 700); const b = await cmd(st); await check(`Alt+H odkryje a vybere (${JSON.stringify(b)})`, () => b && b[0] === false && b[1] === true);
    await cmd("[o.select_set(o.name == 'Cube') for o in bpy.data.objects]; bpy.context.view_layer.objects.active = bpy.data.objects['Cube']"); await wait(300);
    /* menu M se otevře pod myší (Search… pod kurzorem), „New Collection" o řádek níž; psaní v menu = hledání, proto klik */
    await hover(); await key("m", 900); await page.screenshot({ path: "out/jr_hidecol_menu.png" }); const m = mid(); await page.mouse.move(m[0] - 60, m[1] + 26, { steps: 3 }); await wait(300); await page.mouse.click(m[0] - 60, m[1] + 26); await wait(900); await page.screenshot({ path: "out/jr_hidecol_name.png" });
    await page.keyboard.press("Control+a"); await page.keyboard.type("Nabytek", { delay: 40 }); await wait(300); await key("Enter", 700); await page.screenshot({ path: "out/jr_hidecol_name2.png" }); await key("Enter", 900);
    const c = await cmd(st); await page.screenshot({ path: "out/jr_hidecol_done.png" }); await check(`M ▸ New Collection „Nabytek" (${JSON.stringify(c)})`, () => c && c[2].length === 1 && c[2][0] === "Nabytek");
    await hover(); await page.keyboard.press("Control+z"); await wait(900); const d = await cmd(st); await check(`Ctrl+Z vrátí do Collection (${JSON.stringify(d)})`, () => d && d[2][0] === "Collection");
  },
  /* 8. 11. večer: nůž (K) myší: v Edit módu klik na střed přední a zadní hrany horní plochy, Enter. Desktop: horní plocha se rozdělí (v 8->10, f 6->7), Ctrl+Z zpět. */
  knife: async ({ check, cmd, page, wait, hover, key, at }) => {
    await hover(); await key("Tab", 900); await key("a", 400);
    await check("Tab: edit mode", (s) => s.mode === "EDIT_MESH" && s.v === 8);
    const p1 = at(await cmd("eval:_px(bpy.context.object.matrix_world @ mathutils.Vector((0, -1, 1)))"));
    const p2 = at(await cmd("eval:_px(bpy.context.object.matrix_world @ mathutils.Vector((0, 1, 1)))"));
    await hover(); await key("k", 700);
    for (const p of [p1, p2]) { await page.mouse.move(p[0], p[1], { steps: 6 }); await wait(350); await page.mouse.click(p[0], p[1]); await wait(500); }
    await page.screenshot({ path: "out/jr_knife_cut.png" }); await key("Enter", 1200);
    await check("K klik, klik, Enter: horní plocha rozdělena (v 10, f 7)", (s) => s.mode === "EDIT_MESH" && s.v === 10 && s.f === 7);
    await hover(); await page.keyboard.press("Control+z"); await wait(1000);
    await check("Ctrl+Z: zase 8 vrcholů, 6 ploch", (s) => s.v === 8 && s.f === 6);
  },
  /* 8. 11. večer: Bevel myší: Edit, A, Ctrl+B, tah od středu, kolečko nahoru = +1 segment, klik. Desktop 5.2.3 (bmesh.ops.bevel všech hran):
   * 1 seg v24 f26, 2 seg v56 f54, 3 seg v96 f98. Kolečko: 1 zub = +1 segment (1 -> 2). */
  bevel: async ({ check, page, wait, hover, key, mid }) => {
    await hover(); await key("Tab", 900); await key("a", 400);
    const m = mid(); await page.mouse.move(m[0] + 120, m[1] + 40, { steps: 3 }); await wait(300);
    await page.keyboard.press("Control+b"); await wait(700);
    for (let i = 1; i <= 8; i++) { await page.mouse.move(m[0] + 120 + i * 8, m[1] + 40 + i * 3); await wait(60); }
    await wait(400); await page.mouse.wheel(0, -100); await wait(700); await page.screenshot({ path: "out/jr_bevel_modal.png" });
    await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1200);
    await check("Ctrl+B, tah, 1 zub kolečka nahoru, klik: 2 segmenty (v 56, f 54 jako desktop)", (s) => s.mode === "EDIT_MESH" && s.v === 56 && s.f === 54);
    await hover(); await page.keyboard.press("Control+z"); await wait(1000);
    await check("Ctrl+Z: zase kostka (v 8)", (s) => s.v === 8 && s.f === 6);
  },
  /* 8. 11. večer: Shift+D a pohyb zrušený PRAVÝM tlačítkem (desktop: kopie zůstane na místě originálu), pak G + držený Ctrl = snap
   * po celých jednotkách (výchozí Increment, pohled z výchozí vzdálenosti), Esc během G vrátí polohu. */
  dupsnap: async ({ check, cmd, page, wait, hover, key, mid }) => {
    const st = "eval:[(o.name, [round(v, 3) for v in o.location]) for o in bpy.context.selected_objects]";
    await cmd("[o.select_set(o.name == 'Cube') for o in bpy.data.objects]; bpy.context.view_layer.objects.active = bpy.data.objects['Cube']"); await wait(300);
    const m = mid(); await hover(); await page.keyboard.press("Shift+d"); await wait(600);
    for (let i = 1; i <= 10; i++) { await page.mouse.move(m[0] + i * 12, m[1]); await wait(40); }
    await wait(300); await page.mouse.click(m[0] + 120, m[1], { button: "right" }); await wait(900);
    const a = await cmd(st); await check(`Shift+D, tah, pravé tlačítko: kopie na místě (${JSON.stringify(a)})`, (s) => s.objs === 4 && a && a.length === 1 && a[0][0] === "Cube.001" && a[0][1].join() === "0,0,0");
    await hover(); await key("g", 500); await page.keyboard.down("Control"); await wait(150);
    for (let i = 1; i <= 15; i++) { await page.mouse.move(m[0] + i * 11, m[1] + i * 2); await wait(50); }
    await wait(300); await page.mouse.down(); await wait(80); await page.mouse.up(); await page.keyboard.up("Control"); await wait(900);
    const b = await cmd(st); await check(`G + Ctrl: snap na celé jednotky (${JSON.stringify(b)})`, () => b && b[0][1].every((v) => Math.abs(v - Math.round(v)) < 1e-3) && b[0][1].some((v) => v !== 0));
    await hover(m); await key("g", 500); for (let i = 1; i <= 8; i++) { await page.mouse.move(m[0] - i * 10, m[1]); await wait(40); } await key("Escape", 800);
    const c = await cmd(st); await check(`G a Esc: poloha beze změny (${JSON.stringify(c)})`, () => c && c[0][1].join() === b[0][1].join());
  },
  /* 8. 11. večer: F3 „Shade Auto Smooth" na opici: Blender 5 přidá modifikátor z essentials assetu (smooth_by_angle.blend). Desktop 5.2.3: modifikátor
   * „Smooth by Angle" (NODES) s node group „Smooth by Angle". Pak F3 „Shade Flat": desktop 5.2.3 modifikátor smaže a plochy flat ([] 0), Ctrl+Z. */
  autosmooth: async ({ check, cmd, page, wait, hover, key }) => {
    const st = "eval:(lambda o: [o.name, [(m.type, m.name, m.node_group.name if m.type == 'NODES' and m.node_group else None) for m in o.modifiers], sum(p.use_smooth for p in o.data.polygons)])(bpy.context.object)";
    await cmd("bpy.ops.mesh.primitive_monkey_add(location=(0, 0, 0)); bpy.ops.ed.undo_push(message='monkey')"); await wait(900);
    const f3 = async (t) => { await hover(); await key("F3", 800); await page.keyboard.type(t, { delay: 50 }); await wait(900); await key("Enter", 2500); };
    await f3("auto smooth"); await page.screenshot({ path: "out/jr_autosmooth.png" });
    const a = await cmd(st); await check(`F3 Shade Auto Smooth: modifikátor Smooth by Angle (${JSON.stringify(a)})`, () => a && a[1].length === 1 && a[1][0][0] === "NODES" && /Smooth by Angle/.test(a[1][0][2] || "") && a[2] === 500);
    await f3("shade flat"); const b = await cmd(st); await check(`F3 Shade Flat: plochy flat, modifikátor pryč jako desktop (${JSON.stringify(b)})`, () => b && b[2] === 0 && b[1].length === 0);
    await hover(); await page.keyboard.press("Control+z"); await wait(1200);
    const c = await cmd(st); await check(`Ctrl+Z: modifikátor zpět (${JSON.stringify(c)})`, () => c && c[1].length === 1 && c[2] === 500);
    await page.keyboard.press("Control+z"); await wait(1200);
    const d = await cmd(st); await check(`2. Ctrl+Z: bez modifikátoru (${JSON.stringify(d)})`, () => d && d[1].length === 0);
  },
  /* 8. 11. večer: úklid sítě: Edit, A, Shift+D a pravé tlačítko (duplikát na místě: v 16), A (slučuje jen vybrané), M ▸ By Distance (v 8, hlášení „Removed 8 vertices").
   * Menu M v Edit módu nemá hledání: At Center, At Cursor, Collapse, By Distance; písmeno = podtržená zkratka položky (B = By Distance). */
  mergedist: async ({ check, page, wait, hover, key, mid }) => {
    await hover(); await key("Tab", 900); await key("a", 400);
    const m = mid(); await page.keyboard.press("Shift+d"); await wait(600);
    for (let i = 1; i <= 8; i++) { await page.mouse.move(m[0] + i * 10, m[1]); await wait(40); }
    await page.mouse.click(m[0] + 80, m[1], { button: "right" }); await wait(900);
    await check("Shift+D + pravé tlačítko v Edit: v 16", (s) => s.mode === "EDIT_MESH" && s.v === 16);
    await hover(); await key("a", 400); await key("m", 900); await page.screenshot({ path: "out/jr_mergedist_menu.png" });
    await key("b", 1200);
    await check("M, B (By Distance): v 8", (s) => s.v === 8 && s.f === 6);
    await hover(); await page.keyboard.press("Control+z"); await wait(1000);
    await check("Ctrl+Z: v 16", (s) => s.v === 16);
  },
  /* 8. 11. večer: Edit, 3 (plochy), klik na horní plochu, I + tah myší + klik (desktop: inset 1 quadu = v 12, f 10), Ctrl+Z;
   * pak mřížka 11×11 vrcholů, 1 vrchol uprostřed, O (proporcionální), G Z tah, klik: pohnou se i sousedé (desktop: > 1 vrchol). */
  inset: async ({ check, cmd, page, wait, hover, key, at, mid }) => {
    await hover(); await key("Tab", 900); await key("3", 400); await key("Alt+a", 400);
    const top = at(await cmd("top")); await page.mouse.move(top[0], top[1], { steps: 3 }); await wait(300); await page.mouse.click(top[0], top[1]); await wait(600);
    await check("klik na horní plochu: 1 vybraná", (s) => s.fsel === 1);
    const m = mid(); await page.mouse.move(m[0] + 160, m[1] + 60, { steps: 3 }); await wait(250); await key("i", 600);
    for (let i = 1; i <= 8; i++) { await page.mouse.move(m[0] + 160 - i * 8, m[1] + 60 - i * 3); await wait(50); }
    await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1000);
    await check("I + tah + klik: inset (v 12, f 10)", (s) => s.v === 12 && s.f === 10);
    await hover(); await page.keyboard.press("Control+z"); await wait(1000); await check("Ctrl+Z: v 8", (s) => s.v === 8);
    await key("Tab", 800);
    await cmd("bpy.ops.object.select_all(action='DESELECT'); bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=10, size=4); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='VERT'); bpy.ops.mesh.select_all(action='DESELECT'); import bmesh; _bm = bmesh.from_edit_mesh(bpy.context.object.data); _v = min(_bm.verts, key=lambda v: v.co.length); _v.select = True; bmesh.update_edit_mesh(bpy.context.object.data); bpy.ops.ed.undo_push(message='grid')"); await wait(1200);
    await check("mřížka, 1 vybraný vrchol", (s) => s.vsel === 1 && s.v === 121);
    const zs = "eval:(lambda o: (o.update_from_editmode(), sum(1 for v in o.data.vertices if abs(v.co.z) > 1e-4))[1])(bpy.context.object)";
    await hover(); await key("o", 500); await key("g", 500); await key("z", 300);
    for (let i = 1; i <= 10; i++) { await page.mouse.move(m[0], m[1] - i * 8); await wait(50); }
    await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1000);
    const n = await cmd(zs); const pe = await cmd("eval:bpy.context.scene.tool_settings.use_proportional_edit");
    await check(`O, G Z tah, klik: pohne se víc vrcholů (${n}, proportional=${pe})`, () => pe === true && n > 1);
    await key("o", 400);
  },
  /* 8. 11. večer: S 2, F3 „apply scale" (Object ▸ Apply ▸ Scale: scale 1, vrcholy ×2, zmax 2), Tab, G X 2, Tab, F3 „origin to geometry"
   * (Object ▸ Set Origin: loc x 2, síť zase kolem počátku objektu). Desktop: tytéž operátory, stejné hodnoty. */
  origin: async ({ check, page, wait, hover, key }) => {
    const f3 = async (t) => { await hover(); await key("F3", 800); await page.keyboard.type(t, { delay: 50 }); await wait(900); await page.screenshot({ path: "out/jr_origin_f3.png" }); await key("Enter", 1500); };
    await hover(); await key("s", 400); await key("2", 300); await key("Enter", 800);
    await check("S 2: scale 2", (s) => s.scale.join() === "2,2,2");
    await f3("apply scale"); await check("F3 Apply ▸ Scale: scale 1, zmax 2", (s) => s.scale.join() === "1,1,1" && s.zmax === 2);
    await hover(); await key("Tab", 900); await key("a", 300); await key("g", 400); await key("x", 300); await key("2", 300); await key("Enter", 800); await key("Tab", 900);
    await check("Tab, G X 2, Tab: objekt pořád v počátku", (s) => s.mode === "OBJECT" && s.loc.join() === "0,0,0");
    await f3("origin to geometry"); await check("F3 Origin to Geometry: loc x 2", (s) => Math.abs(s.loc[0] - 2) < 1e-3 && s.loc[1] === 0 && s.loc[2] === 0);
    await hover(); await page.keyboard.press("Control+z"); await wait(1000); await check("Ctrl+Z: loc 0", (s) => s.loc.join() === "0,0,0");
  },
  /* 8. 11. večer: Edit, A, Shift+D X 3 Enter (druhý kus vedle), P ▸ By Loose Parts (menu P: Selection, By Material, By Loose Parts; písmeno L),
   * Tab: 2 objekty po 8 vrcholech (desktop stejně). Ctrl+Z vrátí nejdřív Tab (krok historie), druhé Ctrl+Z jeden objekt se 16 vrcholy. */
  loose: async ({ check, cmd, page, wait, hover, key }) => {
    await hover(); await key("Tab", 900); await key("a", 300); await page.keyboard.press("Shift+d"); await wait(500); await key("x", 300); await key("3", 300); await key("Enter", 800);
    await check("Shift+D X 3: v 16", (s) => s.v === 16);
    await hover(); await key("p", 900); await page.screenshot({ path: "out/jr_loose_menu.png" }); await key("l", 1200);
    await key("Tab", 900);
    const a = await cmd("eval:sorted((o.name, len(o.data.vertices)) for o in bpy.data.objects if o.type == 'MESH')");
    await check(`P L (By Loose Parts): 2 kostky po 8 (${JSON.stringify(a)})`, (s) => s.objs === 4 && a && a.length === 2 && a.every((x) => x[1] === 8));
    await hover(); await page.keyboard.press("Control+z"); await wait(1200);
    await check("1. Ctrl+Z vrátí Tab: Edit, pořád 2 objekty", (s) => s.mode === "EDIT_MESH" && s.objs === 4);
    await page.keyboard.press("Control+z"); await wait(1200);
    await check("2. Ctrl+Z vrátí rozdělení: 1 objekt, v 16", (s) => s.objs === 3 && s.v === 16);
  },
  /* 8. 11. večer: běžné zkratky (desktop 5.2.3 výchozí keymap): Ctrl+2 = Subdivision úroveň 2, Ctrl+0 = úroveň 0, Alt+G/R/S = vynulovat
   * polohu/rotaci/měřítko, Alt+Z = X-ray, / = Local View, Ctrl+Space = maximalizovat oblast (vše znovu = zpět). */
  keys3: async ({ check, cmd, page, wait, hover, key }) => {
    const sub = "eval:[(m.type, m.levels) for m in bpy.context.object.modifiers]";
    await hover(); await key("Control+2", 900); const a = await cmd(sub); await check(`Ctrl+2: Subdivision 2 (${JSON.stringify(a)})`, () => a && a.length === 1 && a[0][0] === "SUBSURF" && a[0][1] === 2);
    await hover(); await key("Control+0", 900); const b = await cmd(sub); await check(`Ctrl+0: úroveň 0 (${JSON.stringify(b)})`, () => b && b.length === 1 && b[0][1] === 0);
    await cmd("o = bpy.context.object; o.location = (1, 2, 3); o.rotation_euler = (0.5, 0, 0); o.scale = (2, 2, 2); bpy.ops.ed.undo_push(message='tr')"); await wait(600);
    await hover(); await key("Alt+g", 600); await key("Alt+r", 600); await key("Alt+s", 800);
    await check("Alt+G, Alt+R, Alt+S: vše vynulováno", (s) => s.loc.join() === "0,0,0" && s.rot.join() === "0,0,0" && s.scale.join() === "1,1,1");
    const xr = "eval:[a.spaces[0].shading.show_xray for a in bpy.context.window.screen.areas if a.type == 'VIEW_3D'][0]";
    await hover(); await key("Alt+z", 800); const x1 = await cmd(xr); await hover(); await key("Alt+z", 800); const x2 = await cmd(xr);
    await check(`Alt+Z: X-ray zap/vyp (${x1}, ${x2})`, () => x1 === true && x2 === false);
    const lv = "eval:[a.spaces[0].local_view is not None for a in bpy.context.window.screen.areas if a.type == 'VIEW_3D'][0]";
    await hover(); await key("Slash", 1200); const l1 = await cmd(lv); await hover(); await key("Slash", 1200); const l2 = await cmd(lv);
    await check(`/: Local View zap/vyp (${l1}, ${l2})`, () => l1 === true && l2 === false);
    await hover(); await key("Control+Space", 1200); const f1 = (await cmd("state")).screen_full; await hover(); await key("Control+Space", 1200);
    await check(`Ctrl+Space: maximalizace a zpět (${f1})`, (s) => f1 === true && s.screen_full === false && s.areas === 4);
  },
  /* 8. 11. večer: výběr smyčky: mřížka 5×5 vrcholů, Edit, 2 (hrany), Alt+klik na hranu prostřední řady = celá řada (5 vrcholů),
   * Shift+Alt+klik na hranu o řadu výš = přidá druhou (10). Desktop: stejné (edge loop přes čtyřúhelníky). Na Macu Option+klik. */
  loopsel: async ({ check, cmd, page, wait, hover, key, at }) => {
    await cmd("bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_grid_add(x_subdivisions=4, y_subdivisions=4, size=4); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='EDGE'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.ed.undo_push(message='grid')"); await wait(1200);
    await check("mřížka 25 vrcholů, nic vybráno", (s) => s.v === 25 && s.vsel === 0);
    const e1 = at(await cmd("eval:_px(bpy.context.object.matrix_world @ mathutils.Vector((0.5, 0, 0)))"));
    const e2 = at(await cmd("eval:_px(bpy.context.object.matrix_world @ mathutils.Vector((0.5, 1, 0)))"));
    const altClick = async (p, shift) => { await page.mouse.move(p[0], p[1], { steps: 4 }); await wait(250); if (shift) await page.keyboard.down("Shift"); await page.keyboard.down("Alt"); await wait(60); await page.mouse.click(p[0], p[1]); await wait(60); await page.keyboard.up("Alt"); if (shift) await page.keyboard.up("Shift"); await wait(700); };
    await altClick(e1, false); await page.screenshot({ path: "out/jr_loopsel_1.png" });
    await check("Alt+klik: řada 5 vrcholů", (s) => s.vsel === 5);
    await altClick(e2, true); await page.screenshot({ path: "out/jr_loopsel_2.png" });
    await check("Shift+Alt+klik: druhá řada (10)", (s) => s.vsel === 10);
  },
  /* 8. 11. večer: obrázek pro texturu: UV Editing, nad Image Editorem Alt+N (dialog New Image: pole Name je hned v editaci, Enter Enter = OK), Shift+Alt+S (Save As, Blenderův
   * souborový prohlížeč), Enter = uložit. Desktop: soubor „untitled.png" ve výchozí složce prohlížeče, image.filepath vyplněná. */
  imgsave: async ({ check, cmd, page, wait, tab, at, key }) => {
    await tab("UV Editing");
    const ie = await cmd("eval:(lambda w: [[r.x + r.width // 2, w.height - r.y - r.height // 2] for a in w.screen.areas if a.type == 'IMAGE_EDITOR' for r in a.regions if r.type == 'WINDOW'][0])(bpy.context.window_manager.windows[0])");
    const p = at(ie); const imgs = "eval:[(i.name, i.size[0], i.filepath, os.path.exists(bpy.path.abspath(i.filepath)) if i.filepath else False) for i in bpy.data.images if i.source in ('GENERATED', 'FILE')]";
    await page.mouse.move(p[0], p[1], { steps: 3 }); await wait(300); await key("Alt+n", 1000); await page.screenshot({ path: "out/jr_imgsave_new.png" }); await key("Enter", 500); await key("Enter", 1200);
    const a = await cmd(imgs); await check(`Alt+N, Enter, Enter: nový obrázek 1024 (${JSON.stringify(a)})`, () => a && a.some((x) => x[1] === 1024));
    await page.mouse.move(p[0], p[1], { steps: 2 }); await wait(300); await key("Shift+Alt+s", 2000); await page.screenshot({ path: "out/jr_imgsave_fb.png" });
    await key("Enter", 2500); await page.screenshot({ path: "out/jr_imgsave_done.png" });
    const b = await cmd(imgs); await check(`Shift+Alt+S, Enter: uloženo na disk (${JSON.stringify(b)})`, () => b && b.some((x) => x[1] === 1024 && x[2] && x[3] === true));
    await tab("Layout");
  },
  /* 8. 11. večer: G G = posun vrcholu PO HRANĚ (vertex slide): mřížka 5×5, vrchol uprostřed, G, G, tah myší, klik. Desktop: vrchol zůstane
   * na jedné z hran (x nebo y zůstane 0, z 0), počet vrcholů stejný. Pak Esc během G G vrátí polohu. */
  slide: async ({ check, cmd, page, wait, hover, key, at, mid }) => {
    await cmd("bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_grid_add(x_subdivisions=4, y_subdivisions=4, size=4); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='VERT'); bpy.ops.mesh.select_all(action='DESELECT'); import bmesh; _bm = bmesh.from_edit_mesh(bpy.context.object.data); _v = min(_bm.verts, key=lambda v: v.co.length); _v.select = True; bmesh.update_edit_mesh(bpy.context.object.data); bpy.ops.ed.undo_push(message='grid')"); await wait(1200);
    const co = "eval:(lambda o: (o.update_from_editmode(), [[round(c, 3) for c in v.co] for v in o.data.vertices if v.select])[1])(bpy.context.object)";
    const c = at(await cmd("eval:_px(mathutils.Vector((0, 0, 0)))")); const e = at(await cmd("eval:_px(mathutils.Vector((1, 0, 0)))"));
    await page.mouse.move(c[0], c[1], { steps: 3 }); await wait(300); await key("g", 300); await key("g", 500);
    for (let i = 1; i <= 10; i++) { await page.mouse.move(c[0] + (e[0] - c[0]) * i / 16, c[1] + (e[1] - c[1]) * i / 16); await wait(50); }
    await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(900);
    const a = await cmd(co); await check(`G G, tah, klik: vrchol na hraně (${JSON.stringify(a)})`, (s) => s.v === 25 && a && a.length === 1 && a[0][2] === 0 && (a[0][0] === 0) !== (a[0][1] === 0));
    await page.mouse.move(c[0], c[1], { steps: 2 }); await key("g", 300); await key("g", 500); for (let i = 1; i <= 6; i++) { await page.mouse.move(c[0] - i * 8, c[1]); await wait(40); } await key("Escape", 800);
    const b = await cmd(co); await check(`G G a Esc: beze změny (${JSON.stringify(b)})`, () => b && JSON.stringify(b) === JSON.stringify(a));
  },
  /* 8. 11. večer: iPad klávesnice nemá numpad: Preferences ▸ Input ▸ Emulate Numpad, pak 1 = Front, 3 = Right, 7 = Top, 0 = kamera,
   * 5 = orto/perspektiva (desktop: stejné pohledy, view_perspective ORTHO po 1/3/7 z „Auto Perspective"). Na konci předvolbu vrátit. */
  numemu: async ({ check, cmd, page, wait, hover, key }) => {
    const v = "eval:(lambda r: [r.view_perspective, [round(x, 2) for x in r.view_rotation]])([a.spaces[0].region_3d for a in bpy.context.window.screen.areas if a.type == 'VIEW_3D'][0])";
    await cmd("bpy.context.preferences.inputs.use_emulate_numpad = True"); await wait(500);
    const q = {}; for (const k of ["1", "3", "7", "0"]) { await hover(); await key(k, 900); q[k] = await cmd(v); }
    await check(`1/3/7/0: Front ${JSON.stringify(q[1])}, Right ${JSON.stringify(q[3])}, Top ${JSON.stringify(q[7])}, kamera ${JSON.stringify(q[0])}`, () =>
      q[1] && q[1][1].join() === "0.71,0.71,0,0" && q[3][1].join() === "0.5,0.5,0.5,0.5" && q[7][1].join() === "1,0,0,0" && q[0][0] === "CAMERA");
    await hover(); await key("7", 800); const o1 = await cmd(v); await hover(); await key("5", 800); const o2 = await cmd(v);
    await check(`7 = ORTHO, 5 přepne na PERSP (${o1 && o1[0]} -> ${o2 && o2[0]})`, () => o1 && o1[0] === "ORTHO" && o2 && o2[0] === "PERSP");
    await cmd("bpy.context.preferences.inputs.use_emulate_numpad = False");
  },
  /* 8. 11. večer: trackpad bez prostředního tlačítka: Preferences ▸ Input ▸ Emulate 3 Button Mouse, Alt+tah levým = orbit (mění se rotace
   * pohledu), Shift+Alt+tah = posun (mění se view_location, rotace ne). Desktop: stejné. Na konci předvolbu vrátit. */
  emu3: async ({ check, cmd, page, wait, mid }) => {
    const v = "eval:(lambda r: [[round(x, 3) for x in r.view_rotation], [round(x, 3) for x in r.view_location]])([a.spaces[0].region_3d for a in bpy.context.window.screen.areas if a.type == 'VIEW_3D'][0])";
    await cmd("bpy.context.preferences.inputs.use_mouse_emulate_3_button = True"); await wait(500);
    const m = mid();
    const drag = async (mods) => { await page.mouse.move(m[0], m[1], { steps: 2 }); await wait(250); for (const k of mods) await page.keyboard.down(k); await wait(60); await page.mouse.down();
      for (let i = 1; i <= 12; i++) { await page.mouse.move(m[0] + i * 10, m[1] + i * 3); await wait(40); } await page.mouse.up(); for (const k of mods.slice().reverse()) await page.keyboard.up(k); await wait(800); };
    const a0 = await cmd(v); await drag(["Alt"]); const a1 = await cmd(v);
    await check(`Alt+tah: orbit (rotace ${JSON.stringify(a0 && a0[0])} -> ${JSON.stringify(a1 && a1[0])})`, (s) => a1 && a1[0].join() !== a0[0].join() && s.mode === "OBJECT" && s.sel === 1);
    await drag(["Shift", "Alt"]); const a2 = await cmd(v);
    await check(`Shift+Alt+tah: posun (poloha ${JSON.stringify(a1 && a1[1])} -> ${JSON.stringify(a2 && a2[1])}, rotace stejná)`, () => a2 && a2[1].join() !== a1[1].join() && a2[0].join() === a1[0].join());
    await cmd("bpy.context.preferences.inputs.use_mouse_emulate_3_button = False");
  },
  /* 8. 11. večer: číselná pole myší (N-panel, Location): tah doprava = hodnota roste; dvojklik = psaní „1.5" Enter; stisk na X, tah dolů
   * přes Y a Z a pak doprava = všechna tři pole stejně (multi-drag). Desktop: stejné chování (výchozí předvolby). */
  fielddrag: async ({ check, cmd, page, wait, hover, key, at }) => {
    await hover(); await key("n", 900);
    const fx = await cmd("eval:(lambda w: [[r.x, w.height - r.y - r.height, r.width, r.height] for a in w.screen.areas if a.type == 'VIEW_3D' for r in a.regions if r.type == 'UI'][0])(bpy.context.window_manager.windows[0])");
    const X = at([fx[0] + fx[2] * 0.62, fx[1] + 64]), Y = at([fx[0] + fx[2] * 0.62, fx[1] + 64 + 20]), Z = at([fx[0] + fx[2] * 0.62, fx[1] + 64 + 40]);
    await page.mouse.move(X[0], X[1], { steps: 2 }); await wait(300); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(X[0] + i * 6, X[1]); await wait(40); } await page.mouse.up(); await wait(800);
    await check("tah polem X doprava: x > 0", (s) => s.loc[0] > 0 && s.loc[1] === 0);
    await page.mouse.move(X[0], X[1], { steps: 2 }); await wait(300); await page.mouse.dblclick(X[0], X[1]); await wait(600);
    await page.keyboard.press("Control+a"); await page.keyboard.type("1.5", { delay: 60 }); await key("Enter", 800);
    await check("dvojklik, 1.5, Enter: x = 1.5", (s) => s.loc[0] === 1.5);
    await page.mouse.move(X[0], X[1], { steps: 2 }); await wait(300); await page.mouse.down(); await wait(100);
    for (let i = 1; i <= 8; i++) { await page.mouse.move(X[0], X[1] + (Z[1] - X[1]) * i / 8); await wait(50); }
    for (let i = 1; i <= 10; i++) { await page.mouse.move(X[0] + i * 6, Z[1]); await wait(40); } await page.mouse.up(); await wait(900);
    await page.screenshot({ path: "out/jr_fielddrag_multi.png" });
    await check("stisk na X, dolů přes Y, Z, doprava: všechna tři změněna stejně", (s) => s.loc[1] !== 0 && s.loc[2] !== 0 && Math.abs(s.loc[1] - s.loc[2]) < 1e-3 && Math.abs((s.loc[0] - 1.5) - s.loc[1]) < 1e-3);
    await hover(); await key("n", 500);
  },
  /* 8. 11.: Edit ▸ Undo History: skok o víc kroků zpět jedním klikem, pak Ctrl+Shift+Z. Desktop: seznam kroků, klik na „Move" vrátí stav po tom kroku. */
  undohist: async ({ check, cmd, page, wait, hover, key, box }) => {
    const mv = async (ax) => { await hover(); await key("g", 300); await key(ax, 200); await key("1", 200); await key("Enter", 800); };
    await mv("x"); await mv("y"); await mv("z"); await check("G X/Y/Z 1: loc [1,1,1]", (s) => s.loc.join() === "1,1,1");
    /* výchozí keymap nemá zkratku (Ctrl+Alt+Z jen legacy) -> menu Edit myší */
    await page.mouse.move(box.x + 75, box.y + 12, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 75, box.y + 12); await wait(900); await page.screenshot({ path: "out/jr_undohist_edit.png" });
    await page.mouse.move(box.x + 125, box.y + 76, { steps: 4 }); await wait(1200); await page.screenshot({ path: "out/jr_undohist_sub.png" });
    /* podmenu: Move (nynější), Move, Move, Original; 3. řádek = stav po G X 1 */
    await page.mouse.move(box.x + 300, box.y + 76, { steps: 4 }); await wait(300); await page.mouse.move(box.x + 312, box.y + 119, { steps: 4 }); await wait(400); await page.mouse.click(box.x + 312, box.y + 119); await wait(1200);
    await check("klik na 1. Move v Undo History: loc [1,0,0]", (s) => s.loc.join() === "1,0,0");
    await hover(); await page.keyboard.press("Control+Shift+z"); await wait(900); await check("pak Ctrl+Shift+Z: loc [1,1,0]", (s) => s.loc.join() === "1,1,0");
  },
  /* 8. 11.: Outliner myší: přetáhnout Cube na jinou kolekci (přesun), pravé tlačítko ▸ Delete. Desktop: tažení řádku na kolekci = přesun.
   * Cube začne v kolekci Nabytek (dole), táhne se NAHORU: u spodního okraje malého Outlineru se seznam při tažení sám posouvá (i desktop). */
  outdrag: async ({ check, cmd, page, wait, box }) => {
    const st = "eval:(lambda o: [c.name for c in o.users_collection] if o else None)(bpy.data.objects.get('Cube'))";
    await cmd("c = bpy.data.collections.new('Nabytek'); bpy.context.scene.collection.children.link(c); o = bpy.data.objects['Cube']; c.objects.link(o); bpy.data.collections['Collection'].objects.unlink(o); bpy.ops.ed.undo_push(message='setup')"); await wait(900);
    const drag = async (x0, y0, x1, y1) => { await page.mouse.move(box.x + x0, box.y + y0, { steps: 3 }); await wait(300); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + x0 + (x1 - x0) * i / 12, box.y + y0 + (y1 - y0) * i / 12); await wait(40); } await wait(500); await page.screenshot({ path: "out/jr_outdrag_drop.png" }); await page.mouse.up(); await wait(1000); };
    await page.screenshot({ path: "out/jr_outdrag_start.png" }); const a0 = await cmd(st);
    await drag(1250, 163, 1250, 83); const a = await cmd(st);
    await check(`Cube přetažen z Nabytek na Collection (${JSON.stringify(a0)} -> ${JSON.stringify(a)})`, () => a && a.length === 1 && a[0] === "Collection");
    await page.mouse.move(box.x + 500, box.y + 400); await wait(200); await page.keyboard.press("Control+z"); await wait(900); const b = await cmd(st); await check(`Ctrl+Z vrátí (${JSON.stringify(b)})`, () => b && b[0] === "Nabytek");
    const n0 = (await cmd("state")).objs; await page.mouse.move(box.x + 1250, box.y + 123, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 1250, box.y + 123, { button: "right" }); await wait(900); await page.screenshot({ path: "out/jr_outdrag_ctx.png" });
    /* menu: Copy, Paste, Delete, … pod sebou po 20 px od kurzoru */
    await page.mouse.move(box.x + 1140, box.y + 143, { steps: 3 }); await wait(300); await page.mouse.move(box.x + 1140, box.y + 169, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 1140, box.y + 169); await wait(1000);
    const gone = await cmd("eval:'Light' not in bpy.data.objects"); await check(`pravé tlačítko ▸ Delete smaže Light (objektů ${n0} -> ${n0 - 1}, ${gone})`, (s) => s.objs === n0 - 1 && gone === true);
  },
  /* 8. 11.: Preferences ▸ Interface ▸ Resolution Scale 1.5 (na iPadu kvůli prstům): UI se překreslí, kliky trefují zvětšené prvky (záložka, pole v N-panelu), pak zpět 1.0. */
  uiscale: async ({ check, cmd, page, wait, box, hover, key }) => {
    await cmd("bpy.context.preferences.view.ui_scale = 1.5"); await wait(2500); await page.screenshot({ path: "out/jr_uiscale_15.png" });
    const sc = await cmd("eval:round(bpy.context.preferences.system.ui_scale, 3)"); console.log("UISCALE system " + sc);
    await page.mouse.move(box.x + 525, box.y + 19, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 525, box.y + 19); await wait(2500); await check(`klik na zvětšenou záložku Modeling (ui_scale ${sc})`, (s) => s.ws === "Modeling");
    await page.mouse.move(box.x + 430, box.y + 19, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 430, box.y + 19); await wait(2500); await check("klik zpět na Layout", (s) => s.ws === "Layout");
    await hover(); await key("g", 300); await key("x", 200); await key("1", 200); await key("Enter", 900); await check("G X 1 se zvětšeným UI", (s) => s.loc[0] === 1);
    await cmd("bpy.context.preferences.view.ui_scale = 1.0"); await wait(2000); await page.screenshot({ path: "out/jr_uiscale_10.png" });
    await page.mouse.move(box.x + 350, box.y + 13, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 350, box.y + 13); await wait(2500); await check("po návratu na 1.0 klik na Modeling", (s) => s.ws === "Modeling");
  },
  /* 8. 11.: ukládání klávesami jako uživatel. Web nemá Blenderův souborový prohlížeč pro Save (záměr portu, wm_files.cc __EMSCRIPTEN__):
   * Chrome = výběr složky prohlížeče (__blenderSaveHook, systémový dialog, test ho jen zachytí), Safari (webkit_sim) = stažení .blend. */
  saveui: async ({ check, cmd, page, wait, hover, key }) => {
    const sim = /webkit_sim=1/.test(Q + page.url());
    await page.evaluate(() => { window.__saveHookCalls = 0; const o = window.__blenderSaveHook; window.__blenderSaveHook = () => { window.__saveHookCalls++; }; window.__saveHookOrig = o; });
    const dl = () => page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    if (!sim) {
      await hover(); await page.keyboard.press("Control+Shift+s"); await wait(1500); const n1 = await page.evaluate(() => window.__saveHookCalls);
      await check(`Ctrl+Shift+S otevře výběr složky prohlížeče (${n1}×)`, () => n1 === 1);
      await hover(); await page.keyboard.press("Control+s"); await wait(1500); const n2 = await page.evaluate(() => window.__saveHookCalls);
      await check(`Ctrl+S u neuloženého souboru taky (${n2}×)`, () => n2 === 2);
      await cmd("bpy.ops.wm.save_as_mainfile(filepath='/opfs/home/mujmodel.blend')"); await wait(1200);
      await hover(); await key("g", 300); await key("x", 200); await key("3", 200); await key("Enter", 900);
      await hover(); await page.keyboard.press("Control+s"); await wait(1500); const n3 = await page.evaluate(() => window.__saveHookCalls), dirty = await cmd("eval:bpy.data.is_dirty");
      await check(`Ctrl+S uloženého souboru uloží bez dialogu (dialogů ${n3}, is_dirty ${dirty})`, () => n3 === 2 && dirty === false);
      return;
    }
    let p = dl(); await hover(); await page.keyboard.press("Control+Shift+s"); let d = await p; let size = 0;
    if (d) { const f = `out/jr_saveui_${d.suggestedFilename()}`; await d.saveAs(f); size = (await import("node:fs")).statSync(f).size; }
    await check(`Ctrl+Shift+S stáhne .blend (${d && d.suggestedFilename()}, ${size} B)`, () => d && d.suggestedFilename().endsWith(".blend") && size > 1000);
    await hover(); await key("g", 300); await key("x", 200); await key("3", 200); await key("Enter", 900);
    p = dl(); await hover(); await page.keyboard.press("Control+s"); d = await p; const dirty = await cmd("eval:bpy.data.is_dirty");
    await check(`pak Ctrl+S stáhne znovu (${d && d.suggestedFilename()}, is_dirty ${dirty})`, (s) => d && dirty === false && s.loc[0] === 3);
  },
  /* 8. 11.: Properties ▸ Material ▸ Base Color: klik na pole otevře výběr barvy, tažení v kolečku, hex FF0000, zavřít klikem mimo, Ctrl+Z.
   * Myš chvíli stojí nad kolečkem před stiskem (stisk myší hned po příjezdu se 1× ze 2 ztratil, BACKLOG J4; prstem 12/12 OK, journey touchcolor). Celé sezení ve výběru = 1 krok undo. */
  color: async ({ check, cmd, page, wait, box, key }) => {
    const col = "eval:[round(v, 3) for v in bpy.data.materials['Material'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value]";
    const click = async (x, y, ms = 900) => { await page.mouse.move(box.x + x, box.y + y, { steps: 3 }); await wait(300); await page.mouse.click(box.x + x, box.y + y); await wait(ms); };
    await click(1167, 610, 1200); const c0 = await cmd(col);
    await click(1323, 466, 1200); await page.screenshot({ path: "out/jr_color_picker.png" });
    /* kolečko: střed (1251,196), poloměr ~78 */
    await page.mouse.move(box.x + 1251, box.y + 196, { steps: 3 }); await wait(400); await page.mouse.down(); await wait(150); for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + 1251 + 6 * i, box.y + 196 + 4 * i); await wait(60); } await wait(200); await page.mouse.up(); await wait(900);
    const c1 = await cmd(col); await page.screenshot({ path: "out/jr_color_wheel.png" }); await check(`tažení v kolečku změní barvu (${JSON.stringify(c0)} -> ${JSON.stringify(c1)})`, () => c1 && Math.max(...c1.slice(0, 3)) - Math.min(...c1.slice(0, 3)) > 0.1);
    await page.mouse.move(box.x + 1263, box.y + 437, { steps: 3 }); await wait(300); await page.mouse.dblclick(box.x + 1263, box.y + 437); await wait(600); await page.keyboard.press("Control+a"); await page.keyboard.type("FF0000", { delay: 40 }); await key("Enter", 900);
    const c2 = await cmd(col); await check(`hex FF0000 = červená (${JSON.stringify(c2)})`, () => c2 && c2[0] > 0.99 && c2[1] < 0.01 && c2[2] < 0.01);
    await click(1263, 700); await page.screenshot({ path: "out/jr_color_closed.png" });
    await page.mouse.move(box.x + 600, box.y + 500, { steps: 4 }); await wait(400); await page.keyboard.press("Control+z"); await wait(900); const c3 = await cmd(col);
    await check(`klik mimo zavře, Ctrl+Z vrátí barvu před otevřením (${JSON.stringify(c3)})`, () => c3 && JSON.stringify(c3) === JSON.stringify(c0));
  },
  /* 8. 11. (W2 data, mimo all): zavře se odjetím myši menu Shift+A a kontextové menu? Jen screenshoty. */
  popout: async ({ page, wait, box, hover, mid, cmd }) => {
    console.log("POPOUT menu_close_leave " + JSON.stringify(await cmd("eval:bpy.context.preferences.view.menu_close_leave")));
    const away = async (x0, y0, tag) => { for (let i = 1; i <= 30; i++) { await page.mouse.move(box.x + x0 + 20 * i, box.y + y0 + 8 * i); await wait(30); } await wait(1200); await page.screenshot({ path: `out/jr_popout_${tag}.png` }); await page.keyboard.press("Escape"); await wait(500); };
    const m = mid(); await hover(); await page.keyboard.press("Shift+a"); await wait(900); await page.screenshot({ path: "out/jr_popout_adde.png" }); await away(m[0] - box.x, m[1] - box.y, "add");
    await page.mouse.move(box.x + 200, box.y + 300, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 200, box.y + 300, { button: "right" }); await wait(900); await page.screenshot({ path: "out/jr_popout_ctxe.png" }); await away(200, 300, "ctx");
  },
  /* 8. 11.: Properties ▸ Modifiers: přetáhnout panel modifikátoru za úchyt (⠿) nad jiný = změna pořadí, Ctrl+Z. Desktop: totéž. */
  moddrag: async ({ check, cmd, page, wait, box }) => {
    const ord = "eval:[m.type for m in bpy.data.objects['Cube'].modifiers]";
    await cmd("o = bpy.data.objects['Cube']; o.modifiers.new('Bevel', 'BEVEL'); o.modifiers.new('Subdivision', 'SUBSURF'); bpy.ops.ed.undo_push(message='setup')"); await wait(800);
    await page.mouse.move(box.x + 1167, box.y + 470, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 1167, box.y + 470); await wait(1200);
    const o0 = await cmd(ord);
    /* úchyt ⠿ Subdivision (1375,555) nahoru nad hlavičku Bevel (287) */
    await page.mouse.move(box.x + 1375, box.y + 555, { steps: 3 }); await wait(400); await page.mouse.down(); await wait(150);
    for (let i = 1; i <= 20; i++) { await page.mouse.move(box.x + 1375, box.y + 555 - 14 * i); await wait(40); } await wait(400); await page.screenshot({ path: "out/jr_moddrag_drag.png" }); await page.mouse.up(); await wait(1200);
    const o1 = await cmd(ord); await page.screenshot({ path: "out/jr_moddrag_1.png" }); await check(`tažení za úchyt prohodí pořadí (${JSON.stringify(o0)} -> ${JSON.stringify(o1)})`, () => o1 && o1.join() === "SUBSURF,BEVEL");
    await page.mouse.move(box.x + 500, box.y + 400, { steps: 3 }); await wait(300); await page.keyboard.press("Control+z"); await wait(1000); const o2 = await cmd(ord);
    await check(`Ctrl+Z vrátí pořadí (${JSON.stringify(o2)})`, () => o2 && o2.join() === "BEVEL,SUBSURF");
    await page.mouse.move(box.x + 1202, box.y + 287, { steps: 3 }); await wait(300); await page.mouse.click(box.x + 1202, box.y + 287); await wait(900); const ex = await cmd("eval:[m.show_expanded for m in bpy.data.objects['Cube'].modifiers]");
    await check(`klik na šipku sbalí první panel (${JSON.stringify(ex)})`, () => ex && ex[0] === false && ex[1] === true);
  },
  /* 8. 11.: dotyk mimo 3D pohled (iPad): dlouhé podržení v Outlineru = pravé tlačítko (menu), klepnutí na Delete; dva prsty nad Properties = posun panelu. */
  touchui: async ({ check, cmd, page, wait, box }) => {
    const cdp = await page.context().newCDPSession(page);
    const P = (x, y, id = 0) => ({ x: box.x + x, y: box.y + y, id, radiusX: 4, radiusY: 4, force: 1 });
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
    const tap = async (x, y) => { await touch("touchStart", [P(x, y)]); await wait(80); await touch("touchEnd", []); await wait(900); };
    const n0 = (await cmd("state")).objs;
    await touch("touchStart", [P(1250, 143)]); await wait(800); await touch("touchEnd", []); await wait(900); await page.screenshot({ path: "out/jr_touchui_long.png" });
    /* menu se otevře s 1. položkou (Copy) pod prstem: Copy 143, Paste 163, Delete 189 */
    await tap(1140, 189); const gone = await cmd("eval:'Light' not in bpy.data.objects");
    await check(`podržení na Light ▸ klepnutí Delete (objektů ${n0} -> ${n0 - 1}, smazán ${gone})`, (s) => gone === true && s.objs === n0 - 1);
    const pv = "eval:(lambda r: [round(v) for v in r.view2d.region_to_view(0, 0)])([r for a in bpy.context.window_manager.windows[0].screen.areas if a.type == 'PROPERTIES' for r in a.regions if r.type == 'WINDOW'][0])";
    await cmd("o = bpy.data.objects['Cube']; bpy.context.view_layer.objects.active = o; o.select_set(True)"); await wait(900);
    await tap(1167, 610); await wait(600); const ctxp = await cmd("eval:[a for a in bpy.context.window_manager.windows[0].screen.areas if a.type == 'PROPERTIES'][0].spaces[0].context");
    await check(`klepnutí na záložku Material (${ctxp})`, () => ctxp === "MATERIAL");
    const v0 = await cmd(pv);
    await touch("touchStart", [P(1280, 600, 0), P(1320, 600, 1)]); for (let i = 1; i <= 15; i++) { await touch("touchMove", [P(1280, 600 - 18 * i, 0), P(1320, 600 - 18 * i, 1)]); await wait(30); } await touch("touchEnd", []); await wait(900);
    const v1 = await cmd(pv); await page.screenshot({ path: "out/jr_touchui_scroll.png" }); await check(`dva prsty nahoru posunou Properties (${JSON.stringify(v0)} -> ${JSON.stringify(v1)})`, () => v0 && v1 && Math.abs(v1[1] - v0[1]) > 50);
  },
  /* 8. 11.: výběr barvy prstem: klepnout na Base Color, tah prstem v kolečku (touch.js uidrag = pohyb+stisk naráz). 4 tahy, každý musí barvu změnit. */
  touchcolor: async ({ check, cmd, page, wait, box }) => {
    const cdp = await page.context().newCDPSession(page);
    const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
    const tap = async (x, y) => { await touch("touchStart", [P(x, y)]); await wait(80); await touch("touchEnd", []); await wait(1000); };
    const col = "eval:[round(v, 3) for v in bpy.data.materials['Material'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value]";
    await tap(1167, 610); await tap(1323, 466); await page.screenshot({ path: "out/jr_touchcolor_open.png" });
    const starts = [[1251, 196, 5, 3], [1230, 170, -4, 4], [1270, 220, 4, -5], [1240, 210, -5, -3]]; let ok = 0, prev = await cmd(col); const got = [];
    for (const [x, y, dx, dy] of starts) {
      await touch("touchStart", [P(x, y)]); for (let i = 1; i <= 8; i++) { await touch("touchMove", [P(x + dx * i, y + dy * i)]); await wait(30); } await touch("touchEnd", []); await wait(900);
      const c = await cmd(col); const ch = JSON.stringify(c) !== JSON.stringify(prev); if (ch) ok++; got.push(ch ? "ok" : "ztracen"); prev = c;
    }
    await page.screenshot({ path: "out/jr_touchcolor_end.png" }); await check(`4 tahy prstem v kolečku změní barvu (${got.join(", ")})`, () => ok === 4);
  },
  /* 8. 11.: prstem: tah po časové ose = snímek, tah za hranu oblasti = šířka, menu Add ▸ Mesh ▸ Monkey klepáním. */
  touchmisc: async ({ check, cmd, page, wait, box }) => {
    const cdp = await page.context().newCDPSession(page);
    const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
    const tap = async (x, y, ms = 1000) => { await touch("touchStart", [P(x, y)]); await wait(80); await touch("touchEnd", []); await wait(ms); };
    const drag = async (x0, y0, x1, y1) => { await touch("touchStart", [P(x0, y0)]); for (let i = 1; i <= 12; i++) { await touch("touchMove", [P(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12)]); await wait(30); } await touch("touchEnd", []); await wait(900); };
    /* časová osa: řádek čísel y=807, snímek 1 x=44, 12 x=92 (4 px/snímek) */
    await drag(44, 807, 140, 807); const fr = (await cmd("state")).frame; await check(`tah prstem po časové ose změní snímek (1 -> ${fr})`, () => fr >= 20 && fr <= 28);
    const w = "eval:[a.width for a in bpy.context.window_manager.windows[0].screen.areas if a.type == 'VIEW_3D'][0]"; const w0 = await cmd(w);
    await drag(1151, 450, 1000, 450); const w1 = await cmd(w); await check(`tah za hranu oblasti zúží 3D pohled (${w0} -> ${w1})`, () => w1 < w0 - 100);
    await tap(269, 37); await page.screenshot({ path: "out/jr_touchmisc_add.png" }); await tap(300, 64); await page.screenshot({ path: "out/jr_touchmisc_mesh.png" });
    await tap(475, 247, 1500); await check("Add ▸ Mesh ▸ Monkey jen klepáním", (s) => s.objs === 4 && s.ob.startsWith("Suzanne"));
  },
  /* 8. 11.: sevření prstů na trackpadu v Safari (Mac, iPad s Magic Keyboard) = jen gesturestart/gesturechange, žádné ctrl+wheel.
   * Chrome nemá GestureEvent, proto Event + scale. Desktop Blender na Macu sevřením zoomuje. */
  pinch: async ({ check, cmd, page, wait, mid }) => {
    const dist = () => cmd("eval:round([a for a in bpy.context.window_manager.windows[0].screen.areas if a.type == 'VIEW_3D'][0].spaces[0].region_3d.view_distance, 3)");
    const m = mid(); await page.mouse.move(m[0], m[1]); await wait(400);
    const g = (scales) => page.evaluate(([sc, x, y]) => { const c = document.getElementById("canvas");
      const ev = (t, s) => { const e = new Event(t, { bubbles: true, cancelable: true }); Object.assign(e, { scale: s, clientX: x, clientY: y }); c.dispatchEvent(e); };
      ev("gesturestart", 1); for (const s of sc) ev("gesturechange", s); ev("gestureend", sc[sc.length - 1]); }, [scales, m[0], m[1]]);
    const d0 = await dist(); await g([1.1, 1.25, 1.4, 1.6, 1.8, 2.0]); await wait(1200); const d1 = await dist();
    await check(`roztažení přiblíží: view_distance ${d0} -> ${d1}`, () => d1 < d0);
    await g([0.9, 0.8, 0.7, 0.6, 0.5]); await wait(1200); const d2 = await dist();
    await check(`sevření oddálí: ${d1} -> ${d2}`, () => d2 > d1);
    /* displej iPadu: gesture* chodí i s prsty na displeji; ty zoomuje touch.js, gesto se nesmí přičíst podruhé */
    await page.evaluate(([x, y]) => { const c = document.getElementById("canvas"), t = new Event("touchstart", { bubbles: true }); t.touches = { length: 2 }; c.dispatchEvent(t); }, [m[0], m[1]]);
    await g([1.4, 2.0]); await wait(1000); const d3 = await dist();
    await page.evaluate(() => { const c = document.getElementById("canvas"), t = new Event("touchend", { bubbles: true }); t.touches = { length: 0 }; c.dispatchEvent(t); });
    await check(`gesto s prsty na displeji nezoomuje: ${d2} -> ${d3}`, () => d3 === d2);
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
for (const [n, f] of Object.entries(J)) if ((which === "all" && n !== "j4" && n !== "windows" && n !== "popout") || which.split(",").includes(n)) await run(n, f); /* j4 = otevřená chyba, BACKLOG J4: spouštět zvlášť; windows = ověřit (8. 11.) */
console.log("TABULKA " + results.map((r) => `${r[0]}:${r[1] || r[2] || r[3] || r[4] ? "CHYBA" : "OK"}`).join(" "));
await browser.close();
process.exit(results.some((r) => r[1] || r[2] || r[3] || r[4]) ? 1 : 0);
