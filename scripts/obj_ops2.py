# Objektové operátory (desktop 5.3.0 počty v journey `objops2`): výsledek v `_OO` = [v,e,f] aktivního objektu.
import bpy
_OO = {}
def fresh(prim='cube'):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    getattr(bpy.ops.mesh, 'primitive_%s_add' % prim)(); return bpy.context.object
def cnt(o):
    d = o.data; return [len(d.vertices), len(d.edges), len(d.polygons)]
def mod(o, typ, **kw):
    m = o.modifiers.new(typ, typ)
    for k, v in kw.items(): setattr(m, k, v)
    return m
def t(name, prim, fn):
    try: o = fresh(prim); r = fn(o); _OO[name] = cnt(bpy.context.object)
    except Exception as e: _OO[name] = 'ERR ' + str(e)[:80]
def apply_(typ, prim='cube', **kw):
    def f(o): mod(o, typ, **kw); bpy.ops.object.modifier_apply(modifier=typ)
    return f
t('apply_subsurf', 'cube', apply_('SUBSURF', levels=2, render_levels=2))
t('apply_bevel', 'cube', apply_('BEVEL', width=0.1, segments=2))
t('apply_array', 'cube', apply_('ARRAY', count=4))
t('apply_mirror', 'cube', apply_('MIRROR'))
t('apply_decimate', 'monkey', apply_('DECIMATE', ratio=0.3))
t('apply_remesh', 'monkey', apply_('REMESH', mode='VOXEL', voxel_size=0.1))
t('apply_solidify', 'plane', apply_('SOLIDIFY', thickness=0.1))
t('apply_triangulate', 'cube', apply_('TRIANGULATE'))
t('voxel_remesh', 'monkey', lambda o: (setattr(o.data, 'remesh_voxel_size', 0.08), bpy.ops.object.voxel_remesh()))
t('join', 'cube', lambda o: (bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)), bpy.ops.object.select_all(action='SELECT'), bpy.ops.object.join()))
t('separate_loose', 'cube', lambda o: (bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)), bpy.ops.object.select_all(action='SELECT'), bpy.ops.object.join(), bpy.ops.object.mode_set(mode='EDIT'), bpy.ops.mesh.separate(type='LOOSE'), bpy.ops.object.mode_set(mode='OBJECT')))
t('convert_curve', 'cube', lambda o: (bpy.ops.curve.primitive_bezier_circle_add(), bpy.ops.object.convert(target='MESH')))
t('text_mesh', 'cube', lambda o: (bpy.ops.object.text_add(), bpy.ops.object.convert(target='MESH')))
t('shade_flat', 'uv_sphere', lambda o: bpy.ops.object.shade_flat())
