import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model9_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
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
def t_curve_edit_subdivide():
    fresh(); bpy.ops.curve.primitive_bezier_curve_add(); c = act(); em(); bpy.ops.curve.select_all(action='SELECT'); bpy.ops.curve.subdivide(); ob_()
    chk('curve_subdivide', len(c.data.splines[0].bezier_points) == 3, 'n=%d' % len(c.data.splines[0].bezier_points))
def t_curve_extrude_bevel_convert():
    fresh(); bpy.ops.curve.primitive_bezier_circle_add(); c = act(); c.data.extrude = 0.2; c.data.bevel_depth = 0.05
    bpy.ops.object.convert(target='MESH'); chk('curve_to_mesh', act().type == 'MESH' and len(act().data.polygons) > 10, 'f=%d' % len(act().data.polygons))
def t_nurbs_surface():
    fresh(); bpy.ops.surface.primitive_nurbs_surface_sphere_add(); chk('nurbs_surface', act().type == 'SURFACE')
def t_shape_key_blend():
    ob = fresh(); ob.shape_key_add(name='Basis'); k = ob.shape_key_add(name='K'); k.data[0].co.x += 1; k.value = 0.5
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); d = ev.data.vertices[0].co.x - ob.data.vertices[0].co.x
    chk('shape_key_blend', abs(abs(d) - 0.5) < 1e-3, 'd=%.3f' % d)
def t_geonodes_transform():
    ob = fresh(); ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); t = ng.nodes.new('GeometryNodeTransform'); t.inputs['Translation'].default_value = (0, 0, 5)
    ng.links.new(i.outputs[0], t.inputs['Geometry']); ng.links.new(t.outputs[0], o.inputs[0])
    m = ob.modifiers.new('GN', 'NODES'); m.node_group = ng
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); z = max(v.co.z for v in ev.data.vertices)
    chk('geonodes_transform', z > 5.5, 'zmax=%.2f' % z)
def t_geonodes_instance_on_points():
    ob = fresh('sphere'); ng = bpy.data.node_groups.new('G2', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); p = ng.nodes.new('GeometryNodeInstanceOnPoints'); c = ng.nodes.new('GeometryNodeMeshCube')
    ng.links.new(i.outputs[0], p.inputs['Points']); ng.links.new(c.outputs[0], p.inputs['Instance']); ng.links.new(p.outputs[0], o.inputs[0])
    m = ob.modifiers.new('GN', 'NODES'); m.node_group = ng
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); ob_ = len(ev.data.vertices)
    inst = len(ev.evaluated_geometry().instances_pointcloud().points) if hasattr(ev, 'evaluated_geometry') and False else 0
    dg = bpy.context.evaluated_depsgraph_get(); n = sum(1 for i in dg.object_instances if i.is_instance)
    chk('geonodes_instances', n > 100, 'instances=%d' % n)
def t_uv_pack_seams():
    ob = fresh('sphere'); em(); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.sphere_project(); bpy.ops.uv.pack_islands(margin=0.01); ob_()
    uv = ob.data.uv_layers.active.data; chk('uv_sphere_pack', all(-0.001 <= l.uv.x <= 1.001 for l in uv), 'n=%d' % len(uv))
def t_bake_texture_image():
    ob = fresh(); img = bpy.data.images.new('B', 32, 32); img.pixels[:] = [0.5] * (32 * 32 * 4); chk('image_pixels', abs(img.pixels[0] - 0.5) < 0.01)
def t_image_save_png():
    img = bpy.data.images.new('S', 16, 16); img.filepath_raw = '/tmp/t9.png'; img.file_format = 'PNG'; img.save()
    import os; chk('image_save_png', os.path.exists('/tmp/t9.png') and os.path.getsize('/tmp/t9.png') > 20)
def t_mesh_analysis_bmesh():
    import bmesh
    ob = fresh('sphere'); bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True); n = len(bm.faces); bm.to_mesh(ob.data); bm.free()
    chk('bmesh_subdivide', n > 128, 'f=%d' % n)
def t_lattice_deform():
    ob = fresh('sphere'); bpy.ops.object.add(type='LATTICE'); l = act(); m = ob.modifiers.new('L', 'LATTICE'); m.object = l
    chk('lattice_mod', m.object == l)
def t_array_curve_follow():
    ob = fresh(); a = ob.modifiers.new('A', 'ARRAY'); a.count = 4; ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); chk('array4', len(ev.data.vertices) == 32, 'v=%d' % len(ev.data.vertices))
def t_boolean_difference():
    ob = fresh(); bpy.ops.mesh.primitive_uv_sphere_add(radius=0.9, location=(1, 0, 0)); s = act(); s.hide_set(False)
    m = ob.modifiers.new('B', 'BOOLEAN'); m.object = s; m.operation = 'DIFFERENCE'; m.solver = 'EXACT'
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); chk('boolean_diff', len(ev.data.polygons) > 6, 'f=%d' % len(ev.data.polygons))
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
