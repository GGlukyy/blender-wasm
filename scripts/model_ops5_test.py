import bpy, sys, bmesh, os
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model5_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def fresh():
    a = bpy.context.view_layer.objects.active
    if a and a.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return bpy.context.object
def edit(): bpy.ops.object.mode_set(mode='EDIT')
def obj(): bpy.ops.object.mode_set(mode='OBJECT')
def sel_all(): bpy.ops.mesh.select_all(action='SELECT')
def desel(): bpy.ops.mesh.select_all(action='DESELECT')
def tryit(name, fn):
    try: fn()
    except Exception as e:
        chk(name, False, 'exc=%s' % str(e)[:120])
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
def t_inset():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='FACE'); sel_all(); bpy.ops.mesh.inset(thickness=0.1, use_individual=True); obj()
    chk('inset', len(ob.data.polygons) == 30, 'faces=%d' % len(ob.data.polygons))
def t_loopcut():
    ob = fresh(); edit()
    bpy.ops.mesh.select_mode(type='EDGE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.edges.ensure_lookup_table(); bm.edges[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.select_edge_ring_multi(); bpy.ops.mesh.subdivide(number_cuts=2); obj()
    chk('loopcut_ring_subdiv', len(ob.data.vertices) == 16, 'verts=%d' % len(ob.data.vertices))
def t_bridge():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_circle_add(vertices=8, location=(0, 0, 0)); a = bpy.context.object
    bpy.ops.mesh.primitive_circle_add(vertices=8, location=(0, 0, 2)); b = bpy.context.object
    a.select_set(True); bpy.context.view_layer.objects.active = a; bpy.ops.object.join()
    edit(); bpy.ops.mesh.select_mode(type='EDGE'); sel_all(); bpy.ops.mesh.bridge_edge_loops(); obj()
    chk('bridge', len(bpy.context.view_layer.objects.active.data.polygons) == 8, 'faces=%d' % len(bpy.context.view_layer.objects.active.data.polygons))
def t_fill_grid():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_circle_add(vertices=16); ob = bpy.context.object
    edit(); sel_all(); bpy.ops.mesh.fill_grid(); obj()
    chk('fill_grid', len(ob.data.polygons) >= 4, 'faces=%d' % len(ob.data.polygons))
def t_extrude_edges_rip():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='EDGE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.edges.ensure_lookup_table(); bm.edges[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.extrude_edges_move(TRANSFORM_OT_translate={'value': (0, 0, 1)}); obj()
    chk('extrude_edge', len(ob.data.vertices) == 10, 'verts=%d' % len(ob.data.vertices))
def t_edge_slide():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='EDGE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.edges.ensure_lookup_table(); bm.edges[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.select_edge_ring_multi(); bpy.ops.mesh.subdivide(number_cuts=1); bpy.ops.mesh.select_edge_loop_multi()
    bpy.ops.transform.edge_slide(value=0.5); obj(); chk('edge_slide', len(ob.data.vertices) == 12, 'verts=%d' % len(ob.data.vertices))
def t_remove_doubles():
    ob = fresh(); edit(); sel_all(); bpy.ops.mesh.duplicate(); sel_all(); bpy.ops.mesh.remove_doubles(threshold=0.001); obj()
    chk('remove_doubles', len(ob.data.vertices) == 8, 'verts=%d' % len(ob.data.vertices))
def t_normals():
    ob = fresh(); edit(); sel_all(); bpy.ops.mesh.flip_normals(); bpy.ops.mesh.normals_make_consistent(inside=False); obj()
    import mathutils
    ok = all(p.normal.dot(p.center) > 0 for p in ob.data.polygons)
    chk('normals_outward', ok)
def t_convex_hull():
    ob = fresh(); edit(); sel_all(); bpy.ops.mesh.convex_hull(); obj()
    chk('convex_hull', len(ob.data.vertices) == 8, 'verts=%d' % len(ob.data.vertices))
def t_seam_unwrap():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='EDGE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.edges.ensure_lookup_table()
    for e in bm.edges[:4]: e.select = True
    bmesh.update_edit_mesh(ob.data); bpy.ops.mesh.mark_seam(clear=False); sel_all(); bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.01); obj()
    uvs = [l.uv for l in ob.data.uv_layers.active.data]
    chk('seam_unwrap', len(uvs) == 24 and any(u[0] != 0 for u in uvs), 'loops=%d' % len(uvs))
def t_cube_project_lscm():
    ob = fresh(); edit(); sel_all(); bpy.ops.uv.cube_project(); bpy.ops.uv.lightmap_pack(); obj()
    chk('uv_cube_lightmap', len(ob.data.uv_layers.active.data) == 24)
def t_materials():
    ob = fresh(); m1 = bpy.data.materials.new('A'); m2 = bpy.data.materials.new('B')
    ob.data.materials.append(m1); ob.data.materials.append(m2)
    edit(); bpy.ops.mesh.select_mode(type='FACE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(ob.data)
    ob.active_material_index = 1; bpy.ops.object.material_slot_assign(); obj()
    chk('material_assign', ob.data.polygons[0].material_index == 1 and ob.data.polygons[1].material_index == 0)
def t_mirror_modifier_clip():
    ob = fresh(); m = ob.modifiers.new('M', 'MIRROR'); m.use_clip = True
    bpy.ops.object.modifier_apply(modifier='M')
    chk('mirror_apply', len(ob.data.vertices) >= 8)
def t_weld_modifier():
    ob = fresh(); edit(); sel_all(); bpy.ops.mesh.duplicate(); obj(); m = ob.modifiers.new('W', 'WELD'); m.merge_threshold = 0.001
    bpy.ops.object.modifier_apply(modifier='W')
    chk('weld', len(ob.data.vertices) == 8, 'verts=%d' % len(ob.data.vertices))
def t_shrinkwrap():
    ob = fresh(); ob.location = (0, 0, 3)
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0)); tgt = bpy.context.object
    m = ob.modifiers.new('S', 'SHRINKWRAP'); m.target = tgt; bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='S')
    chk('shrinkwrap', len(ob.data.vertices) == 8)
def t_select_similar_loops():
    ob = fresh(); edit(); bpy.ops.mesh.subdivide(number_cuts=2); bpy.ops.mesh.select_mode(type='FACE'); desel()
    bm = bmesh.from_edit_mesh(ob.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.select_similar(type='FACE_NORMAL'); n = sum(1 for f in bmesh.from_edit_mesh(ob.data).faces if f.select); obj()
    chk('select_similar', n == 9, 'sel=%d' % n)
def t_save_reload():
    ob = fresh(); ob.name = 'Keep'; ob.data.materials.append(bpy.data.materials.new('Mat'))
    p = '/tmp/ops5.blend'; bpy.ops.wm.save_as_mainfile(filepath=p)
    bpy.ops.wm.open_mainfile(filepath=p)
    o = bpy.data.objects.get('Keep')
    chk('save_reload', o is not None and len(o.data.vertices) == 8 and o.data.materials[0].name == 'Mat')
def t_bisect_fill():
    ob = fresh(); edit(); sel_all()
    bpy.ops.mesh.bisect(plane_co=(0, 0, 0), plane_no=(0, 0, 1), use_fill=True); obj()
    chk('bisect_fill', len(ob.data.vertices) >= 12, 'verts=%d' % len(ob.data.vertices))
def t_apply_scale_origin():
    ob = fresh(); ob.scale = (2, 2, 2); ob.select_set(True); bpy.ops.object.transform_apply(scale=True)
    chk('apply_scale', abs(max(v.co.x for v in ob.data.vertices) - 2.0) < 1e-4 and tuple(ob.scale) == (1, 1, 1))
for n, f in sorted([i for i in globals().items() if i[0].startswith('t_')], key=lambda i: i[0] == 't_save_reload'):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
