import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model6_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def act(): return bpy.context.view_layer.objects.active
def fresh():
    a = act()
    if a and a.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return act()
def edit(): bpy.ops.object.mode_set(mode='EDIT')
def obj(): bpy.ops.object.mode_set(mode='OBJECT')
def tryit(name, fn):
    try: fn()
    except Exception as e:
        chk(name, False, 'exc=%s' % str(e)[:120])
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
def t_primitives():
    fresh(); n = 0
    for f in ('primitive_plane_add','primitive_circle_add','primitive_uv_sphere_add','primitive_ico_sphere_add','primitive_cylinder_add','primitive_cone_add','primitive_torus_add','primitive_grid_add','primitive_monkey_add'):
        getattr(bpy.ops.mesh, f)(); n += 1
    for f in ('primitive_bezier_curve_add','primitive_nurbs_path_add','primitive_bezier_circle_add'):
        getattr(bpy.ops.curve, f)(); n += 1
    bpy.ops.object.metaball_add(type='BALL'); bpy.ops.object.empty_add(); bpy.ops.object.light_add(type='AREA'); bpy.ops.object.camera_add()
    bpy.ops.object.armature_add()
    chk('primitives', len(bpy.data.objects) >= n + 5, 'objs=%d' % len(bpy.data.objects))
def t_separate_join():
    ob = fresh(); edit(); bpy.ops.mesh.select_all(action='DESELECT'); bm = bmesh.from_edit_mesh(ob.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.separate(type='SELECTED'); obj()
    n = len([o for o in bpy.data.objects if o.type == 'MESH'])
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.join()
    chk('separate_join', n == 2 and len([o for o in bpy.data.objects if o.type == 'MESH']) == 1)
def t_parent_constraint():
    a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)); b = act()
    c = b.constraints.new('COPY_LOCATION'); c.target = a; a.location = (0, 5, 0); bpy.context.view_layer.update()
    chk('constraint', abs(b.matrix_world.translation.y - 5) < 1e-4, 'y=%.2f' % b.matrix_world.translation.y)
def t_driver():
    ob = fresh(); fc = ob.driver_add('location', 0); fc.driver.type = 'SCRIPTED'; fc.driver.expression = 'frame * 0.5'
    bpy.context.scene.frame_set(4); chk('driver', abs(ob.location.x - 2.0) < 1e-4, 'x=%.2f' % ob.location.x)
def t_origin_snap():
    ob = fresh(); edit(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.transform.translate(value=(2, 0, 0)); obj()
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    chk('origin_geometry', abs(ob.location.x - 2.0) < 1e-4, 'x=%.2f' % ob.location.x)
def t_mirror_object_flip():
    ob = fresh(); edit(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.transform.translate(value=(1, 0, 0)); obj()
    bpy.ops.transform.mirror(orient_type='GLOBAL', constraint_axis=(True, False, False)); bpy.ops.object.transform_apply(scale=True)
    chk('mirror_object_bounds', min(v.co.x for v in ob.data.vertices) < 0 or ob.scale.x == -1 or min((ob.matrix_world @ v.co).x for v in ob.data.vertices) < 0)
def t_curve_extrude_bevel():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.curve.primitive_bezier_curve_add(); c = act(); c.data.bevel_depth = 0.1; c.data.extrude = 0.1
    bpy.ops.object.convert(target='MESH'); chk('curve_bevel_mesh', len(act().data.vertices) > 20, 'verts=%d' % len(act().data.vertices))
def t_metaball_convert():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.object.metaball_add(type='BALL'); bpy.context.view_layer.update(); bpy.ops.object.convert(target='MESH')
    chk('metaball_mesh', act().type == 'MESH' and len(act().data.vertices) > 20, 'verts=%d' % len(act().data.vertices))
def t_boolean_modifier_union():
    a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(1, 0, 0)); b = act()
    m = a.modifiers.new('B', 'BOOLEAN'); m.object = b; m.operation = 'UNION'; m.solver = 'EXACT'
    bpy.context.view_layer.objects.active = a; bpy.ops.object.modifier_apply(modifier='B')
    xs = [v.co.x for v in a.data.vertices]
    chk('boolean_union', len(a.data.vertices) > 8 and abs(min(xs) + 1) < 1e-4 and abs(max(xs) - 2) < 1e-4, 'verts=%d x=[%.2f,%.2f]' % (len(a.data.vertices), min(xs), max(xs)))
def t_collection_instance_export_obj():
    ob = fresh(); p = '/tmp/o6.obj'
    bpy.ops.wm.obj_export(filepath=p); bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.wm.obj_import(filepath=p)
    chk('obj_roundtrip', act() is not None and len(act().data.vertices) == 8)
def t_smart_project_layout():
    ob = fresh(); edit(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=1.15); obj()
    d = ob.data; uvl = d.uv_layers.active.data
    corners = {(round(min(uvl[l].uv[0] for l in p.loop_indices), 2), round(min(uvl[l].uv[1] for l in p.loop_indices), 2)) for p in d.polygons}
    inb = all(-1e-4 <= l.uv[0] <= 1 + 1e-4 and -1e-4 <= l.uv[1] <= 1 + 1e-4 for l in uvl)
    chk('smart_project_layout', inb and len(corners) == 6, 'islands=%d inbounds=%s' % (len(corners), inb))
def t_undo_stack():
    ob = fresh(); bpy.ops.ed.undo_push(message='a'); ob.location.x = 5; bpy.ops.ed.undo_push(message='b')
    bpy.ops.ed.undo(); chk('undo_loc', abs(act().location.x) < 1e-4 if act() else False)
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
