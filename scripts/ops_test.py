# Běží UVNITŘ web Blenderu (--python-expr exec). Každý test: čistá scéna + kostka, operace, kontrola počtů.
# Očekávané hodnoty jsou ze znalosti desktop Blenderu (kostka 8v/12e/6f). Výstup: řádky "OPS <name> PASS|FAIL <detail>".
import bpy, bmesh, sys, traceback, math

def out(*a):
    print(*a); sys.stdout.flush()

def fresh():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add()
    return bpy.context.object

def counts(ob=None):
    ob = ob or bpy.context.object
    if ob.mode == 'EDIT':
        bm = bmesh.from_edit_mesh(ob.data); return (len(bm.verts), len(bm.edges), len(bm.faces))
    m = ob.data; return (len(m.vertices), len(m.edges), len(m.polygons))

def edit(ob, sel='ALL'):
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_mode(type='FACE')
    bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(ob.data)
    if sel == 'ALL':
        bpy.ops.mesh.select_all(action='SELECT')
    elif sel == 'TOP':
        top = max(bm.faces, key=lambda f: f.calc_center_median().z); top.select_set(True)
        bm.select_flush(True); bmesh.update_edit_mesh(ob.data)
    return bm

TESTS = []
def test(name, expect=None):
    def deco(fn): TESTS.append((name, expect, fn)); return fn
    return deco

@test('subdivide', (26, 48, 24))
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.subdivide(number_cuts=1); return counts(ob)
@test('extrude_face', (12, 20, 10))
def _():
    ob = fresh(); edit(ob, 'TOP'); bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value": (0, 0, 1)}); return counts(ob)
@test('inset_face', (12, 20, 10))
def _():
    ob = fresh(); edit(ob, 'TOP'); bpy.ops.mesh.inset(thickness=0.2); return counts(ob)
@test('bevel_edges', (24, 48, 26))   # zkosená kostka: 24v, 6+12+8=26 ploch, Euler -> 48 hran
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.select_mode(type='EDGE'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bevel(offset=0.1, segments=1, affect='EDGES'); return counts(ob)
@test('delete_face', (8, 12, 5))
def _():
    ob = fresh(); edit(ob, 'TOP'); bpy.ops.mesh.delete(type='FACE'); return counts(ob)
@test('triangulate', (8, 18, 12))
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.quads_convert_to_tris(); return counts(ob)
@test('duplicate_merge', (8, 12, 6))
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.duplicate(); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.001); return counts(ob)
@test('dissolve_edges', (None, None, None))
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.subdivide(number_cuts=1); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.dissolve_limited(angle_limit=math.radians(5)); return counts(ob)
@test('loopcut_via_bmesh', (12, 20, 10))
def _():
    ob = fresh(); bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(ob.data)
    ring = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1.5]   # 4 svislé hrany
    bmesh.ops.subdivide_edgering(bm, edges=ring, cuts=1) if hasattr(bmesh.ops, 'subdivide_edgering') else None
    bmesh.update_edit_mesh(ob.data); return counts(ob)
@test('uv_unwrap_and_smart', (None, None, None))
def _():
    ob = fresh(); edit(ob); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
    uv = ob.data.uv_layers.active; assert uv is not None and len(uv.data) == 24, 'uv loops=%s' % (len(uv.data) if uv else None)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.unwrap(method='ANGLE_BASED')
    return counts(ob)
@test('material_assign', (8, 12, 6))
def _():
    ob = fresh(); mat = bpy.data.materials.new('M'); mat.use_nodes = True; ob.data.materials.append(mat)
    assert ob.data.materials[0].node_tree is not None and len(ob.data.materials[0].node_tree.nodes) >= 2
    return counts(ob)
@test('modifier_subsurf_apply', (26, 48, 24))
def _():
    ob = fresh(); m = ob.modifiers.new('S', 'SUBSURF'); m.levels = 1
    bpy.ops.object.modifier_apply(modifier='S'); return counts(ob)
@test('modifier_array_apply', (24, 36, 18))
def _():
    ob = fresh(); m = ob.modifiers.new('A', 'ARRAY'); m.count = 3
    bpy.ops.object.modifier_apply(modifier='A'); return counts(ob)
@test('modifier_mirror_bevel_solidify', (None, None, None))
def _():
    ob = fresh()
    for n, t in (('M', 'MIRROR'), ('B', 'BEVEL'), ('S', 'SOLIDIFY')): ob.modifiers.new(n, t)
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); assert len(ev.data.vertices) > 8
    return (len(ev.data.vertices), len(ev.data.edges), len(ev.data.polygons))
@test('modifier_boolean', (None, None, None))
def _():
    a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(0.8, 0, 0)); b = bpy.context.object
    m = a.modifiers.new('Bool', 'BOOLEAN'); m.object = b; m.operation = 'DIFFERENCE'
    dg = bpy.context.evaluated_depsgraph_get(); ev = a.evaluated_get(dg); n = len(ev.data.vertices); assert n > 8, n
    return (n, len(ev.data.edges), len(ev.data.polygons))
@test('prim_uvsphere', (482, 992, 512))
def _():
    fresh(); bpy.ops.mesh.primitive_uv_sphere_add(); return counts()
@test('prim_torus', (576, 1152, 576))
def _():
    fresh(); bpy.ops.mesh.primitive_torus_add(); return counts()
@test('prim_cylinder', (64, 96, 34))
def _():
    fresh(); bpy.ops.mesh.primitive_cylinder_add(); return counts()
@test('prim_ico2', (42, 120, 80))
def _():
    fresh(); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2); return counts()
@test('prim_monkey', (507, 1005, 500))
def _():
    fresh(); bpy.ops.mesh.primitive_monkey_add(); return counts()
@test('prim_grid', (121, 220, 100))   # 10 dělení = 10x10 ploch
def _():
    fresh(); bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=10); return counts()
@test('join_objects', (16, 24, 12))
def _():
    a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)); bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.join(); return counts()
@test('separate_loose', (8, 12, 6))
def _():
    a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)); bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.join()
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT'); assert len(bpy.context.scene.objects) == 2, len(bpy.context.scene.objects)
    return counts(bpy.context.scene.objects[0])
# undo/redo: bpy.ops.ed.undo() nejde z timeru (poll) -> testuje se skutečnými klávesami, viz scripts/undo_win.sh
@test('geometry_nodes_subdivide', None)
def _():
    ob = fresh(); m = ob.modifiers.new('GN', 'NODES'); ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); sub = ng.nodes.new('GeometryNodeSubdivideMesh')
    sub.inputs['Level'].default_value = 2
    ng.links.new(i.outputs[0], sub.inputs['Mesh']); ng.links.new(sub.outputs[0], o.inputs[0]); m.node_group = ng
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(ev.data.vertices); assert n > 8, n
    return (n, 0, 0)
@test('shape_keys', None)
def _():
    ob = fresh(); ob.shape_key_add(name='Basis'); k = ob.shape_key_add(name='Up')
    for v in k.data: v.co.z += 1.0
    k.value = 1.0; ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    zmax = max(v.co.z for v in ev.data.vertices); assert abs(zmax - 2.0) < 1e-4, zmax
    return (zmax, 0, 0)
@test('animation_keyframes', None)
def _():
    ob = fresh(); sc = bpy.context.scene
    sc.frame_set(1); ob.location.x = 0; ob.keyframe_insert('location', frame=1)
    ob.location.x = 10; ob.keyframe_insert('location', frame=11)
    sc.frame_set(6); x = ob.location.x; assert abs(x - 5.0) < 0.6, x   # bezier ~ mezi 0 a 10
    sc.frame_set(1); return (x, 0, 0)
@test('curve_text_objects', None)
def _():
    fresh(); bpy.ops.curve.primitive_bezier_circle_add(); c = bpy.context.object
    bpy.ops.object.text_add(); t = bpy.context.object; t.data.body = 'Hello'
    dg = bpy.context.evaluated_depsgraph_get(); ev = t.evaluated_get(dg); me = ev.to_mesh()
    n = len(me.vertices); ev.to_mesh_clear(); assert n > 20, n
    return (n, 0, 0)
@test('armature_skin', None)
def _():
    ob = fresh(); bpy.ops.object.armature_add(); arm = bpy.context.object
    ob.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    assert any(m.type == 'ARMATURE' for m in ob.modifiers) and len(ob.vertex_groups) >= 1
    return (len(ob.vertex_groups), 0, 0)
@test('decimate', None)
def _():
    ob = fresh(); bpy.ops.mesh.primitive_uv_sphere_add(); ob = bpy.context.object
    d = ob.modifiers.new('D', 'DECIMATE'); d.ratio = 0.3
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(ev.data.polygons); assert 0 < n < 512, n
    return (n, 0, 0)
@test('physics_cloth', None)
def _():
    fresh(); bpy.ops.mesh.primitive_plane_add(location=(0, 0, 3)); p = bpy.context.object
    bpy.ops.object.modifier_add(type='CLOTH'); sc = bpy.context.scene
    for f in range(1, 6): sc.frame_set(f)
    ev = p.evaluated_get(bpy.context.evaluated_depsgraph_get()); z = max(v.co.z for v in ev.data.vertices)
    assert z < 3.0, z   # tkanina padá gravitací
    sc.frame_set(1); return (z, 0, 0)
@test('texture_paint_image', None)
def _():
    ob = fresh(); img = bpy.data.images.new('T', 64, 64); mat = bpy.data.materials.new('M'); mat.use_nodes = True
    n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; ob.data.materials.append(mat)
    px = list(img.pixels[:4]); assert len(img.pixels) == 64 * 64 * 4
    return (len(px), 0, 0)

@test('shade_smooth_normals', (8, 12, 6))
def _():
    ob = fresh(); bpy.ops.object.shade_smooth(); ob.data.calc_loop_triangles(); assert len(ob.data.loop_triangles) == 12
    return counts(ob)
@test('bmesh_ops_create_cube', (8, 12, 6))
def _():
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=2.0); r = (len(bm.verts), len(bm.edges), len(bm.faces)); bm.free(); return r
@test('export_obj_stl', (None, None, None))
def _():
    import os; ob = fresh(); res = []
    for ext, op in (('obj', lambda p: bpy.ops.wm.obj_export(filepath=p)), ('stl', lambda p: bpy.ops.wm.stl_export(filepath=p)), ('ply', lambda p: bpy.ops.wm.ply_export(filepath=p))):
        p = '/tmp/x.' + ext; op(p); assert os.path.getsize(p) > 50, ext; res.append(ext)
    return tuple([len(res), 0, 0])

@test('voxel_remesh_warns', (None, None, None))
def _():
    # bez OpenVDB nesmí selhat potichu: operátor hlásí chybu (modifikátor: error text v UI, z Pythonu nečitelný)
    ob = fresh(); ob.data.remesh_voxel_size = 0.1
    try:
        bpy.ops.object.voxel_remesh(); raise AssertionError('voxel_remesh nehlásí chybu')
    except RuntimeError as e:
        assert 'OpenVDB' in str(e), str(e)
    return (None, None, None)
@test('save_reload', (26, 48, 24))
def _():
    ob = fresh(); edit(ob); bpy.ops.mesh.subdivide(number_cuts=1); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.wm.save_as_mainfile(filepath='/tmp/ops_test.blend'); import os; assert os.path.getsize('/tmp/ops_test.blend') > 1000
    bpy.ops.wm.open_mainfile(filepath='/tmp/ops_test.blend'); return counts(bpy.context.scene.objects[0])
# ZNÁMÉ MEZERY buildu (WITH_* vypnuto v cmake/blender-wasm-cache.cmake) — hlásí se jako GAP, nepočítají se jako FAIL.
GAPS = [
    ('voxel_remesh (OpenVDB)', lambda: (lambda ob: (setattr(ob.modifiers.new('R', 'REMESH'), 'mode', 'VOXEL'), len(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons))[1])(fresh())),
    ('rigid_body (Bullet)', lambda: (fresh(), bpy.ops.rigidbody.object_add())[1]),
    ('quadriflow_remesh', lambda: (fresh(), bpy.ops.object.quadriflow_remesh())[1]),
]
for name, fn in GAPS:
    try:
        r = fn(); ok = bool(r) and r != {'CANCELLED'}
        out('OPS GAP', name, 'WORKS' if ok else 'MISSING', repr(r)[:80])
    except Exception as e:
        out('OPS GAP', name, 'MISSING', str(e).replace('\n', ' ')[:100])
failed = 0
for name, expect, fn in TESTS:
    try:
        got = fn()
        ok = expect is None or expect == (None, None, None) or tuple(got) == tuple(expect)
        out('OPS', name, 'PASS' if ok else 'FAIL', 'got=%s expect=%s' % (got, expect))
        failed += 0 if ok else 1
    except Exception as e:
        failed += 1
        out('OPS', name, 'FAIL', 'EXC %s: %s' % (type(e).__name__, str(e).replace('\n', ' | ')[:200]))
out('OPS_DONE failed=%d total=%d' % (failed, len(TESTS)))
