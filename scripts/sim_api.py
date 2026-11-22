# Simulace po N snímcích (desktop 5.3.0, journey `simapi`): `_SM`.
import bpy
_SM = {}
r = lambda x, n=3: round(x, n)
def clean():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    bpy.context.scene.frame_set(1)
def run(name, fn):
    try: _SM[name] = fn()
    except Exception as e: _SM[name] = 'ERR ' + str(e)[:80]
def goto(f):
    for i in range(2, f + 1): bpy.context.scene.frame_set(i)
def rb():
    clean(); bpy.ops.mesh.primitive_plane_add(size=10); bpy.ops.rigidbody.object_add(); bpy.context.object.rigid_body.type = 'PASSIVE'
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 3)); bpy.ops.rigidbody.object_add(); goto(40); o = bpy.context.object
    return [r(o.matrix_world.translation.z), r(o.matrix_world.translation.x)]
run('rigidbody', rb)
def cloth():
    clean(); bpy.ops.mesh.primitive_grid_add(x_subdivisions=10, y_subdivisions=10, size=2, location=(0, 0, 2)); o = bpy.context.object; o.modifiers.new('c', 'CLOTH'); goto(15)
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); z = r(sum(v.co.z for v in me.vertices)); ev.to_mesh_clear(); return z
run('cloth', cloth)
def soft():
    clean(); bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 3)); o = bpy.context.object; o.modifiers.new('s', 'SOFT_BODY'); goto(15)
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); z = r(sum(v.co.z for v in me.vertices)); ev.to_mesh_clear(); return z
run('softbody', soft)
def part():
    clean(); bpy.ops.mesh.primitive_plane_add(); o = bpy.context.object; o.modifiers.new('p', 'PARTICLE_SYSTEM'); ps = o.particle_systems[0].settings; ps.count = 50; ps.frame_end = 5; ps.lifetime = 100; goto(10)
    d = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(d); return [len(e.particle_systems[0].particles), r(sum(p.location.z for p in e.particle_systems[0].particles))]
run('particles', part)
def hair():
    clean(); bpy.ops.mesh.primitive_plane_add(); o = bpy.context.object; o.modifiers.new('p', 'PARTICLE_SYSTEM'); ps = o.particle_systems[0].settings; ps.type = 'HAIR'; ps.count = 20; ps.hair_length = 0.5
    d = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(d); return [len(e.particle_systems[0].particles), len(e.particle_systems[0].particles[0].hair_keys)]
run('hair', hair)
