# Spouští se v DESKTOP Blenderu 5.2: vytvoří bohatou scénu + JSON s očekávanými počty. blender -b --python desktop_scene_make.py -- out.blend out.json
import bpy, sys, json, math
out_blend, out_json = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def add(op, **kw):
    op(**kw); return bpy.context.object
# 1 kostka: subsurf + bevel + array + mirror
a = add(bpy.ops.mesh.primitive_cube_add, location=(0, 0, 0)); a.name = 'mods'
a.modifiers.new('m', 'MIRROR'); a.modifiers.new('b', 'BEVEL').segments = 2; a.modifiers.new('s', 'SUBSURF').levels = 2
ar = a.modifiers.new('a', 'ARRAY'); ar.count = 3
# 2 opice se shape keys + vertex group + uv + vertex color
b = add(bpy.ops.mesh.primitive_monkey_add, location=(5, 0, 0)); b.name = 'shapes'
b.shape_key_add(name='Basis'); k = b.shape_key_add(name='Big'); k.value = 0.5
for v in k.data: v.co *= 1.5
vg = b.vertex_groups.new(name='g'); vg.add(list(range(10)), 1.0, 'REPLACE')
b.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
# 3 materiál s nodes + packed image
img = bpy.data.images.new('tex', 32, 32); img.pack()
m = bpy.data.materials.new('M'); m.use_nodes = True
n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img
m.node_tree.links.new(n.outputs['Color'], m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
b.data.materials.append(m)
# 4 animace
c = add(bpy.ops.mesh.primitive_uv_sphere_add, location=(-5, 0, 0)); c.name = 'anim'
c.location.z = 0; c.keyframe_insert('location', frame=1); c.location.z = 4; c.keyframe_insert('location', frame=20)
# 5 GN modifier
d = add(bpy.ops.mesh.primitive_plane_add, location=(0, 5, 0)); d.name = 'gn'
ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); s = ng.nodes.new('GeometryNodeSubdivideMesh'); s.inputs['Level'].default_value = 3
ng.links.new(i.outputs[0], s.inputs[0]); ng.links.new(s.outputs[0], o.inputs[0])
d.modifiers.new('gn', 'NODES').node_group = ng
# 6 text + curve
t = add(bpy.ops.object.text_add, location=(0, -5, 0)); t.data.body = 'Ahoj'
cu = add(bpy.ops.curve.primitive_bezier_circle_add, location=(5, 5, 0)); cu.data.bevel_depth = 0.1
# 7 armature + parent
ar_o = add(bpy.ops.object.armature_add, location=(-5, 5, 0))
# 8 multires
e = add(bpy.ops.mesh.primitive_cube_add, location=(-5, -5, 0)); e.name = 'multires'
e.modifiers.new('mr', 'MULTIRES'); bpy.ops.object.multires_subdivide(modifier='mr', mode='CATMULL_CLARK')
# 9 kolekce + instance + custom prop
col = bpy.data.collections.new('C'); sc.collection.children.link(col)
inst = bpy.data.objects.new('inst', None); inst.instance_type = 'COLLECTION'; inst.instance_collection = col; sc.collection.objects.link(inst)
a['cprop'] = 42
dg = bpy.context.evaluated_depsgraph_get()
exp = {'objects': len(bpy.data.objects), 'eval': {}, 'fcurves': 0}
for ob in bpy.data.objects:
    if ob.type in ('MESH', 'FONT', 'CURVE'):
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); exp['eval'][ob.name] = len(me.vertices); ev.to_mesh_clear()
exp['shape_keys'] = len(b.data.shape_keys.key_blocks); exp['packed'] = img.packed_file is not None; exp['cprop'] = 42
exp['fcurves'] = sum(1 for _ in c.animation_data.action.layers[0].strips[0].channelbags[0].fcurves) if hasattr(c.animation_data.action, 'layers') else len(c.animation_data.action.fcurves)
exp['version_made'] = bpy.app.version_string
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
json.dump(exp, open(out_json, 'w'))
print('MADE', exp)
