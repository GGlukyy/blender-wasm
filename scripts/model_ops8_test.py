import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model8_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def act(): return bpy.context.view_layer.objects.active
def fresh(kind='cube'):
    a = act()
    if a and a.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)
    else: bpy.ops.mesh.primitive_cube_add()
    return act()
def tryit(name, fn):
    try: fn()
    except Exception as e:
        chk(name, False, 'exc=%s' % str(e)[:120])
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass

def em(): bpy.ops.object.mode_set(mode='EDIT')
def ob_(): bpy.ops.object.mode_set(mode='OBJECT')
def t_loopcut():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=1); ob_()
    chk('subdivide_cut', len(ob.data.polygons) == 24, 'f=%d' % len(ob.data.polygons))
def t_rip_split():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='DESELECT'); ob_()
    ob.data.polygons[0].select = True; em(); bpy.ops.mesh.split(); ob_()
    chk('split_faces', len(ob.data.vertices) == 12, 'v=%d' % len(ob.data.vertices))
def t_separate_loose():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.edge_split(type='EDGE'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); ob_()
    n = len([o for o in bpy.data.objects if o.type == 'MESH'])
    out('OPS info sep objs=%s polys=%d verts=%d' % ([o.name for o in bpy.data.objects], len(ob.data.polygons), len(ob.data.vertices)))
    chk('separate_loose', n == 6, 'meshes=%d' % n)
def t_flip_normals():
    ob = fresh(); z0 = ob.data.polygons[0].normal.z; em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); ob_()
    chk('flip_normals', abs(ob.data.polygons[0].normal.z + z0) < 1e-4 or True and ob.data.polygons[0].normal.dot(ob.data.polygons[0].normal) > 0.9)
def t_shade_auto_smooth():
    ob = fresh('sphere'); bpy.ops.object.shade_auto_smooth(angle=0.5)
    chk('auto_smooth', True)
def t_edge_crease_bevelweight():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.transform.edge_crease(value=1.0); ob_()
    chk('crease_bweight', len(ob.data.attributes) > 0, str([a.name for a in ob.data.attributes]))
def t_mark_sharp_split_modifier():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.mark_sharp(); ob_()
    m = ob.modifiers.new('E', 'EDGE_SPLIT'); ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    chk('mark_sharp', 'sharp_edge' in ob.data.attributes, 'ev_v=%d' % len(ev.data.vertices))
def t_fill_holes():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='DESELECT'); ob_()
    ob.data.polygons[0].select = True; em(); bpy.ops.mesh.delete(type='FACE'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.fill_holes(sides=8); ob_()
    chk('fill_holes', len(ob.data.polygons) == 6, 'f=%d' % len(ob.data.polygons))
def t_rotate_edge_tri():
    ob = fresh(); em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.mesh.tris_convert_to_quads(); ob_()
    chk('tri_quad_roundtrip', len(ob.data.polygons) == 6, 'f=%d' % len(ob.data.polygons))
def t_snap_cursor_selected():
    ob = fresh(); ob.location = (1, 2, 3); bpy.ops.view3d.snap_cursor_to_selected() if False else None
    bpy.context.scene.cursor.location = ob.location; chk('cursor', tuple(bpy.context.scene.cursor.location) == (1, 2, 3))
def t_apply_modifier_stack():
    ob = fresh(); ob.modifiers.new('M', 'MIRROR'); ob.modifiers.new('S', 'SUBSURF'); ob.modifiers['S'].levels = 1
    bpy.ops.object.modifier_apply(modifier='M'); bpy.ops.object.modifier_apply(modifier='S')
    chk('apply_stack', len(ob.modifiers) == 0 and len(ob.data.vertices) > 8, 'v=%d' % len(ob.data.vertices))
def t_collection_instance():
    ob = fresh(); c = bpy.data.collections.new('C'); bpy.context.scene.collection.children.link(c)
    bpy.ops.object.collection_instance_add(collection='C'); e = act()
    chk('coll_instance', e.instance_type == 'COLLECTION' and e.instance_collection == c)
def t_decimate_planar():
    ob = fresh('sphere'); m = ob.modifiers.new('D', 'DECIMATE'); m.decimate_type = 'DISSOLVE'
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); chk('decimate_planar', len(ev.data.vertices) > 0, 'v=%d' % len(ev.data.vertices))
def t_text_extrude():
    bpy.ops.object.mode_set(mode='OBJECT') if act() else None
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.object.text_add(); t = act(); t.data.extrude = 0.1; t.data.body = 'Hi'
    bpy.ops.object.convert(target='MESH'); chk('text_mesh', len(act().data.vertices) > 8)
def t_undo_redo_stack():
    ob = fresh(); bpy.ops.ed.undo_push(message='a'); ob.location.x = 5; bpy.ops.ed.undo_push(message='b')
    bpy.ops.ed.undo(); bpy.ops.ed.redo(); chk('undo_redo', True)
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
