# Modelovací operace s ověřením výsledku: UV unwrap, materiál, merge by distance, inset+extrude, bevel, save/reload.
import bpy, bmesh, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_cube_add(); ob = bpy.context.object; me = ob.data
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
uv = me.uv_layers.active
xs = [d.uv.x for d in uv.data] if uv else []
chk('uv_smart_project', bool(xs) and len(xs) == 24 and max(xs) - min(xs) > 0.1, 'loops=%d' % len(xs))
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.02); bpy.ops.object.mode_set(mode='OBJECT')
ys = [d.uv.y for d in me.uv_layers.active.data]
chk('uv_unwrap', len(ys) == 24 and max(ys) - min(ys) > 0.1)
bpy.ops.object.material_slot_add(); m = bpy.data.materials.new('M'); ob.material_slots[0].material = m
m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1, 0, 0, 1)
chk('material', len(ob.material_slots) == 1 and ob.active_material.name == 'M')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.subdivide(number_cuts=1); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0001); bpy.ops.object.mode_set(mode='OBJECT')
chk('subdivide_merge', len(me.vertices) == 26, 'verts=%d' % len(me.vertices))
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.inset(thickness=0.1); bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, 0.2)}); bpy.ops.object.mode_set(mode='OBJECT')
v1 = len(me.vertices); chk('inset_extrude', v1 > 26, 'verts=%d' % v1)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.bevel(offset=0.02, segments=2); bpy.ops.object.mode_set(mode='OBJECT')
v2 = len(me.vertices); chk('bevel', v2 > v1, 'verts=%d' % v2)
f = '/opfs/home/model_ops.blend'
bpy.ops.wm.save_as_mainfile(filepath=f)
bpy.ops.wm.open_mainfile(filepath=f)
o2 = bpy.data.objects[0]
chk('save_reload', len(o2.data.vertices) == v2 and o2.active_material and o2.active_material.name == 'M' and o2.data.uv_layers.active is not None, 'verts=%d' % len(o2.data.vertices))
out('OPS_DONE')
