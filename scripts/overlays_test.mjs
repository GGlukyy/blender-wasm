// Matice shading/overlay voleb ve 3D viewportu: každá se zapne, snímek se porovná s výchozím a hlídají se GPU chyby. node overlays_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out/ovl", { recursive: true });
const expr = `import bpy, sys
def P(*a):
    print(*a); sys.stdout.flush()
def sp():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': return a.spaces[0]
CASES = [
 ('shading.type', 'WIREFRAME'), ('shading.type', 'MATERIAL'), ('shading.type', 'RENDERED'), ('shading.type', 'SOLID'),
 ('shading.light', 'FLAT'), ('shading.light', 'MATCAP'), ('shading.light', 'STUDIO'),
 ('shading.color_type', 'OBJECT'), ('shading.color_type', 'RANDOM'), ('shading.color_type', 'TEXTURE'), ('shading.color_type', 'VERTEX'), ('shading.color_type', 'MATERIAL'),
 ('shading.show_xray', True), ('shading.show_xray', False), ('shading.show_cavity', True), ('shading.show_cavity', False),
 ('shading.show_object_outline', False), ('shading.show_object_outline', True), ('shading.show_shadows', True), ('shading.show_shadows', False),
 ('overlay.show_wireframes', True), ('overlay.show_wireframes', False), ('overlay.show_face_orientation', True), ('overlay.show_face_orientation', False),
 ('overlay.show_floor', False), ('overlay.show_floor', True), ('overlay.show_axis_x', False), ('overlay.show_axis_x', True),
 ('overlay.show_extras', False), ('overlay.show_extras', True), ('overlay.show_outline_selected', False), ('overlay.show_outline_selected', True),
 ('overlay.show_stats', True), ('overlay.show_stats', False), ('overlay.show_text', False), ('overlay.show_text', True),
 ('overlay.show_cursor', False), ('overlay.show_cursor', True), ('overlay.show_relationship_lines', False), ('overlay.show_relationship_lines', True),
 ('MODE', 'EDIT'), ('EXEC', 'MARK'),
 ('overlay.show_edge_crease', True), ('overlay.show_edge_sharp', True), ('overlay.show_edge_seams', True), ('overlay.show_edge_bevel_weight', True),
 ('overlay.show_vertex_normals', True), ('overlay.show_face_normals', True), ('overlay.show_split_normals', True),
 ('overlay.show_faces', False), ('overlay.show_faces', True), ('overlay.show_edges', False), ('overlay.show_edges', True),
 ('overlay.show_freestyle_edge_marks', True), ('overlay.show_freestyle_face_marks', True), ('overlay.show_face_center', True), ('overlay.show_retopology', True),
 ('overlay.show_statvis', True), ('overlay.show_weight', True), ('overlay.show_weight', False), ('overlay.show_mesh_analysis', True), ('overlay.show_mesh_analysis', False),
 ('overlay.show_occlude_wire', True), ('overlay.show_occlude_wire', False), ('overlay.show_indices', True),
 ('MODE', 'OBJECT'),
 ('SCENE', 'MONKEY_SUBSURF'), ('shading.type', 'WIREFRAME'), ('shading.type', 'SOLID'), ('overlay.show_wireframes', True), ('overlay.show_wireframes', False),
]
st = {'i': -1}
def tick():
    if st['i'] >= len(CASES):
        P('OVL_DONE'); return None
    if st['i'] >= 0:
        k, v = CASES[st['i']]
        try:
            if k == 'MODE': bpy.ops.object.mode_set(mode=v)
            elif k == 'EXEC':
                import bmesh
                ob = bpy.context.object; bm = bmesh.from_edit_mesh(ob.data)
                cl = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
                bl = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
                for e in bm.edges: e[cl] = 1.0; e[bl] = 1.0; e.smooth = False; e.seam = True
                bmesh.update_edit_mesh(ob.data)
                sp().overlay.normals_length = 0.4
            elif k == 'SCENE':
                bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
                bpy.ops.mesh.primitive_monkey_add(); bpy.ops.object.modifier_add(type='SUBSURF')
            else:
                o, a = k.split('.'); setattr(getattr(sp(), o), a, v)
            P('OVLSET', st['i'], k, v)
        except Exception as e:
            P('OVLERR', st['i'], k, v, str(e)[:100])
    st['i'] += 1
    return 3.0
def zoom():
    sp().region_3d.view_distance = 7.0
    return None
bpy.app.timers.register(zoom, first_interval=8.0)
bpy.app.timers.register(tick, first_interval=10.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const BAD = /ABORT|GPUValidationError|Invalid CommandBuffer|RuntimeError|unreachable|WGPU_FATAL|Aborted/;
let logs = [], errs = 0, done = false; const marks = []; let tb = 0, tbl = [];
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); if (tb > 0) { tbl.push(t); tb--; if (tb === 0 && !tbl.some((x) => /bl_pkg|addon_utils/.test(x))) logs.push("Traceback: " + tbl.slice(0, 3).join(" | ").slice(0, 200)); } if (/Traceback/.test(t)) { tb = 8; tbl = []; } if (BAD.test(t) && !/_multiprocessing|bl_pkg|addon_utils|\\^\\^|~~~/.test(t)) logs.push(t.slice(0, 160));
  const i = t.indexOf("OVLSET"); if (i >= 0) marks.push(t.slice(i + 7).trim());
  if (t.includes("OVLERR")) console.log(t.slice(t.indexOf("OVLERR")));
  if (t.includes("OVL_DONE")) done = true; });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(3000); await page.keyboard.press("Escape"); await page.mouse.move(700, 450);
const region = { x: 150, y: 100, width: 800, height: 560 };
const hashOf = async (buf) => page.evaluate(async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, nz = 0; for (let i = 0; i < d.length; i += 4) { s = (s * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) >>> 0; if (d[i] + d[i + 1] + d[i + 2] > 60) nz++; } return { s, nz }; }, buf.toString("base64"));
const shot = async (n) => { const b = await page.locator("#canvas").screenshot({ clip: region }).catch(() => page.screenshot({ clip: region })); const h = await hashOf(b); return { h, b }; };
let seen = 0, prev = (await shot("base")).h, results = [], blank = 0;
const t0 = Date.now();
while (!done && Date.now() - t0 < 600000) {
  if (marks.length > seen) {
    const m = marks[seen++]; await wait(1200);
    const { h, b } = await shot(m);
    const changed = h.s !== prev.s; prev = h;
    if (h.nz < 50) blank++;
    results.push({ m, changed, nz: h.nz });
    console.log("OVL", changed ? "changed" : "SAME   ", String(h.nz).padStart(6), m);
    if (/./.test(m)) { const fs = await import("node:fs"); fs.writeFileSync(`out/ovl/${seen}_${m.replace(/\W+/g, "_")}.png`, b); }
  } else await wait(300);
}
console.log("bad logs:", logs.length, logs.slice(0, 5)); console.log("blank frames:", blank, "errors", errs);
console.log(done && logs.length === 0 && errs === 0 && blank === 0 ? "PASS: overlays" : "FAIL: overlays");
await browser.close();
