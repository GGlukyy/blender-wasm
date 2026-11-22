# UV operátory (desktop 5.3.0, journey `uvops`): `_UV` = [počet loops, součet u, součet v] zaokrouhleno na 2 desetinná místa.
import bpy
_UV = {}
def fresh(prim):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    getattr(bpy.ops.mesh, 'primitive_%s_add' % prim)(); o = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); return o
def res(o):
    bpy.ops.object.mode_set(mode='OBJECT'); uv = o.data.uv_layers.active.data
    return [len(uv), round(sum(l.uv[0] for l in uv), 2), round(sum(l.uv[1] for l in uv), 2)]
def t(name, prim, fn):
    try: o = fresh(prim); fn(o); _UV[name] = res(o)
    except Exception as e: _UV[name] = 'ERR ' + str(e)[:80]
t('smart', 'cube', lambda o: bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02))
t('cubeproj', 'cube', lambda o: bpy.ops.uv.cube_project())
t('sphereproj', 'uv_sphere', lambda o: bpy.ops.uv.sphere_project())
t('cylproj', 'cylinder', lambda o: bpy.ops.uv.cylinder_project())
t('reset', 'cube', lambda o: bpy.ops.uv.reset())
t('unwrap_seams', 'cube', lambda o: (bpy.ops.mesh.select_all(action='DESELECT'), bpy.ops.object.mode_set(mode='OBJECT'), [setattr(e, 'use_seam', True) for e in o.data.edges if e.index in (0, 3, 5, 8, 9, 10, 11)], bpy.ops.object.mode_set(mode='EDIT'), bpy.ops.mesh.select_all(action='SELECT'), bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.01)))
