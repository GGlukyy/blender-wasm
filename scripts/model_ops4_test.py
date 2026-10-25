import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model4_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def fresh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return bpy.context.object
def edit(): bpy.ops.object.mode_set(mode='EDIT')
def obj(): bpy.ops.object.mode_set(mode='OBJECT')
def sel_all(): bpy.ops.mesh.select_all(action='SELECT')
def tryit(name, fn):
    try: fn()
    except Exception as e: chk(name, False, 'exc=%s' % str(e)[:120])
def t_armature_parent_auto():
    ob = fresh(); bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.object
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    chk('armature_auto', ob.parent == arm and any(m.type == 'ARMATURE' for m in ob.modifiers) and len(ob.vertex_groups) >= 1, 'vgs=%d' % len(ob.vertex_groups))
def t_keyframes():
    ob = fresh(); ob.location.x = 0; ob.keyframe_insert('location', frame=1); ob.location.x = 5; ob.keyframe_insert('location', frame=11)
    bpy.context.scene.frame_set(6); chk('keyframes', abs(ob.location.x - 2.5) < 0.6, 'x=%.2f' % ob.location.x); bpy.context.scene.frame_set(1)
def t_lattice_modifier():
    ob = fresh(); bpy.ops.object.add(type='LATTICE'); lat = bpy.context.object
    m = ob.modifiers.new('L', 'LATTICE'); m.object = lat; bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='L')
    chk('lattice', len(ob.data.vertices) == 8)
def t_displace_cast():
    ob = fresh(); bpy.context.view_layer.objects.active = ob
    m = ob.modifiers.new('C', 'CAST'); m.factor = 1.0; bpy.ops.object.modifier_apply(modifier='C')
    chk('cast', len(ob.data.vertices) == 8)
def t_weighted_normal_edgesplit():
    ob = fresh(); bpy.context.view_layer.objects.active = ob
    ob.modifiers.new('E', 'EDGE_SPLIT'); bpy.ops.object.modifier_apply(modifier='E'); chk('edge_split', len(ob.data.vertices) >= 8)
def t_remesh_voxel_guard():
    ob = fresh(); bpy.context.view_layer.objects.active = ob
    m = ob.modifiers.new('R', 'REMESH'); m.mode = 'BLOCKS'; m.octree_depth = 3
    bpy.ops.object.modifier_apply(modifier='R'); chk('remesh_blocks', len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
def t_multires():
    ob = fresh(); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_add(type='MULTIRES'); bpy.ops.object.multires_subdivide(modifier='Multires', mode='CATMULL_CLARK')
    chk('multires', ob.modifiers['Multires'].total_levels == 1)
def t_material_nodes():
    ob = fresh(); m = bpy.data.materials.new('M'); m.use_nodes = True; ob.data.materials.append(m)
    bsdf = m.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (1, 0, 0, 1)
    tex = m.node_tree.nodes.new('ShaderNodeTexNoise'); m.node_tree.links.new(tex.outputs[0], bsdf.inputs['Roughness'])
    chk('material_nodes', len(m.node_tree.links) >= 2)
def t_vertex_color_attr():
    ob = fresh(); a = ob.data.color_attributes.new('c', 'BYTE_COLOR', 'CORNER'); chk('color_attr', a.name == 'c')
def t_geonodes_modifier():
    ob = fresh(); bpy.context.view_layer.objects.active = ob
    ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); s = ng.nodes.new('GeometryNodeSubdivideMesh'); s.inputs['Level'].default_value = 1
    ng.links.new(i.outputs[0], s.inputs[0]); ng.links.new(s.outputs[0], o.inputs[0])
    m = ob.modifiers.new('GN', 'NODES'); m.node_group = ng; bpy.ops.object.modifier_apply(modifier='GN')
    chk('geonodes_subdiv', len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
def t_collection_link_move():
    ob = fresh(); c = bpy.data.collections.new('C'); bpy.context.scene.collection.children.link(c)
    c.objects.link(ob)
    for oc in list(ob.users_collection):
        if oc != c: oc.objects.unlink(ob)
    chk('collection', ob.name in c.objects)
def t_camera_light():
    bpy.ops.object.camera_add(); bpy.ops.object.light_add(type='SUN'); chk('cam_light', bpy.context.object.type == 'LIGHT')
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
