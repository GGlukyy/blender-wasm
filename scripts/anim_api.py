# Animace/constraints/drivers (desktop 5.3.0, journey `animapi`): `_AN`.
import bpy, math
_AN = {}
r = lambda x, n=3: round(x, n)
def clean():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    bpy.context.scene.frame_set(1)
def run(name, fn):
    try: _AN[name] = fn()
    except Exception as e: _AN[name] = 'ERR ' + str(e)[:80]
def keys():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object
    o.location.x = 0; o.keyframe_insert('location', index=0, frame=1); o.location.x = 10; o.keyframe_insert('location', index=0, frame=21)
    bpy.context.scene.frame_set(6); a = o.location.x; bpy.context.scene.frame_set(16); return [r(a), r(o.location.x)]
run('keys', keys)
def fcm():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; o.keyframe_insert('location', index=2, frame=1); fc = o.animation_data.action.fcurves[0] if hasattr(o.animation_data.action, 'fcurves') else None
    return len(o.animation_data.action.layers) if hasattr(o.animation_data.action, 'layers') else 0
run('layers', fcm)
def drv():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; d = o.driver_add('location', 1).driver; d.type = 'SCRIPTED'; d.expression = 'frame * 0.5 + sqrt(16)'
    bpy.context.scene.frame_set(10); bpy.context.view_layer.update(); return r(o.location.y)
run('driver', drv)
def con():
    clean(); bpy.ops.object.empty_add(location=(5, 0, 0)); t = bpy.context.object; bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object
    c = o.constraints.new('COPY_LOCATION'); c.target = t; bpy.context.view_layer.update(); a = r(o.matrix_world.translation.x)
    o.constraints.clear(); c = o.constraints.new('TRACK_TO'); c.target = t; c.track_axis = 'TRACK_X'; c.up_axis = 'UP_Z'; bpy.context.view_layer.update()
    e = o.matrix_world.to_euler(); return [a, r(e.z)]
run('constraints', con)
def shape():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; o.shape_key_add(name='B'); k = o.shape_key_add(name='K'); k.data[0].co.z += 2; k.value = 0.5
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); z = r(max(v.co.z for v in me.vertices)); ev.to_mesh_clear(); return z
run('shapekey', shape)
def arm():
    clean(); bpy.ops.object.armature_add(); a = bpy.context.object; bpy.ops.mesh.primitive_cube_add(); m = bpy.context.object
    m.parent = a; m.modifiers.new('A', 'ARMATURE').object = a; vg = m.vertex_groups.new(name='Bone'); vg.add(list(range(len(m.data.vertices))), 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = a; bpy.ops.object.mode_set(mode='POSE'); pb = a.pose.bones['Bone']; pb.rotation_mode = 'XYZ'; pb.rotation_euler.x = math.pi / 2; bpy.ops.object.mode_set(mode='OBJECT')
    ev = m.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); s = r(sum(v.co.y for v in me.vertices)), r(max(v.co.z for v in me.vertices)); ev.to_mesh_clear(); return list(s)
run('armature', arm)
def nla():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; o.location.x = 0; o.keyframe_insert('location', index=0, frame=1); o.location.x = 4; o.keyframe_insert('location', index=0, frame=11)
    for fc in (o.animation_data.action.fcurves if hasattr(o.animation_data.action, 'fcurves') else []): pass
    bpy.context.scene.frame_set(11); return r(o.location.x)
run('nla', nla)
def interp():
    clean(); bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; o.location.x = 0; o.keyframe_insert('location', index=0, frame=1); o.location.x = 8; o.keyframe_insert('location', index=0, frame=9)
    bpy.context.scene.frame_set(5); return r(o.location.x)
run('bezier', interp)
