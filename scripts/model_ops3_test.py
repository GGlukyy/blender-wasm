import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model3_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def fresh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return bpy.context.object
def edit(): bpy.ops.object.mode_set(mode='EDIT')
def obj(): bpy.ops.object.mode_set(mode='OBJECT')
def sel_all(): bpy.ops.mesh.select_all(action='SELECT')
def tryit(name, fn):
    try: fn()
    except Exception as e: chk(name, False, 'exc=%s' % str(e)[:120])
def t_array():
    ob = fresh(); m = ob.modifiers.new('A', 'ARRAY'); m.count = 4; bpy.ops.object.modifier_apply(modifier='A')
    chk('array_apply', len(ob.data.vertices) == 32, 'verts=%d' % len(ob.data.vertices))
def t_solidify():
    ob = fresh(); bpy.ops.mesh.primitive_plane_add(); ob = bpy.context.object
    m = ob.modifiers.new('S', 'SOLIDIFY'); m.thickness = 0.2; bpy.ops.object.modifier_apply(modifier='S')
    chk('solidify_apply', len(ob.data.vertices) == 8, 'verts=%d' % len(ob.data.vertices))
def t_bevel_edges():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='EDGE'); sel_all(); bpy.ops.mesh.bevel(offset=0.1, segments=2); obj()
    chk('bevel_edges', len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
def t_loop_to_face_fill():
    ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(ob.data); bm.faces.ensure_lookup_table(); bm.faces[0].select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.delete(type='FACE'); bpy.ops.mesh.select_mode(type='EDGE'); sel_all(); bpy.ops.mesh.edge_face_add(); obj()
    chk('delete_face_fill', len(ob.data.polygons) >= 5, 'faces=%d' % len(ob.data.polygons))
def t_triangulate_quads():
    ob = fresh(); edit(); sel_all(); bpy.ops.mesh.quads_convert_to_tris(); obj()
    n1 = len(ob.data.polygons); edit(); sel_all(); bpy.ops.mesh.tris_convert_to_quads(); obj()
    chk('tris_quads', n1 == 12 and len(ob.data.polygons) == 6, 'tris=%d quads=%d' % (n1, len(ob.data.polygons)))
def t_proportional_translate():
    ob = fresh(); edit(); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.mesh.select_all(action='DESELECT')
    bm = bmesh.from_edit_mesh(ob.data); bm.verts.ensure_lookup_table(); max(bm.verts, key=lambda v: v.co.z).select = True; bmesh.update_edit_mesh(ob.data)
    bpy.ops.transform.translate(value=(0, 0, 1), use_proportional_edit=True, proportional_size=2.0); obj()
    moved = sum(1 for v in ob.data.vertices if abs(v.co.z) > 1.0 + 1e-4 or False)
    chk('proportional', max(v.co.z for v in ob.data.vertices) > 1.5, 'zmax=%.2f' % max(v.co.z for v in ob.data.vertices))
def t_spin_screw():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_plane_add(size=0.5, location=(1, 0, 0)); ob = bpy.context.object
    edit(); sel_all(); bpy.ops.mesh.spin(steps=8, angle=6.2832, center=(0, 0, 0), axis=(0, 0, 1)); obj()
    chk('spin', len(ob.data.vertices) >= 16, 'verts=%d' % len(ob.data.vertices))
def t_curve_to_mesh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.curve.primitive_bezier_circle_add(); bpy.ops.object.convert(target='MESH'); ob = bpy.context.object
    chk('curve_to_mesh', ob.type == 'MESH' and len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
def t_text_to_mesh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.object.text_add(); ob = bpy.context.object; ob.data.body = 'Ab'
    bpy.ops.object.convert(target='MESH'); ob = bpy.context.object
    chk('text_to_mesh', ob.type == 'MESH' and len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
def t_vertex_groups_weights():
    ob = fresh(); vg = ob.vertex_groups.new(name='g'); vg.add([0, 1, 2], 0.5, 'REPLACE')
    chk('vgroup', abs(vg.weight(1) - 0.5) < 1e-5)
def t_shape_key():
    ob = fresh(); ob.shape_key_add(name='Basis'); k = ob.shape_key_add(name='K'); k.data[0].co.z += 1.0; k.value = 1.0
    bpy.context.view_layer.update()
    chk('shapekey', abs(k.data[0].co.z - (ob.data.vertices[0].co.z + 1.0)) < 1e-5)
def t_duplicate_linked_instance_collection():
    ob = fresh(); bpy.ops.object.duplicate_move_linked(); chk('dup_linked', len(bpy.data.objects) == 2 and ob.data.users == 2, 'objs=%d users=%d' % (len(bpy.data.objects), ob.data.users))
def t_uv_pack():
    ob = fresh(); edit(); sel_all(); bpy.ops.uv.smart_project(); bpy.ops.uv.pack_islands(margin=0.01); obj()
    uvs = [l.uv for l in ob.data.uv_layers.active.data]
    chk('uv_pack', all(-1e-3 <= u[0] <= 1.001 and -1e-3 <= u[1] <= 1.001 for u in uvs))
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
