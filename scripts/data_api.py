# Mesh/Object data API (desktop 5.3.0, journey `dataapi`): `_DA`.
import bpy, bmesh
from mathutils import Vector
_DA = {}
def t(name, fn):
    try: _DA[name] = fn()
    except Exception as e: _DA[name] = 'ERR ' + str(e)[:80]
r = lambda x, n=4: round(x, n)
def mk(prim):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    getattr(bpy.ops.mesh, 'primitive_%s_add' % prim)(); return bpy.context.object
def tris():
    o = mk('monkey'); o.data.calc_loop_triangles(); return len(o.data.loop_triangles)
t('looptris', tris)
def raycast():
    o = mk('monkey'); ok, loc, nor, idx = o.ray_cast(Vector((0, -5, 0)), Vector((0, 1, 0))); return [ok, [r(x) for x in loc], [r(x) for x in nor], idx]
t('raycast', raycast)
def closest():
    o = mk('monkey'); ok, loc, nor, idx = o.closest_point_on_mesh(Vector((2, 2, 2))); return [[r(x) for x in loc], idx]
t('closest', closest)
def tang():
    o = mk('uv_sphere'); m = o.data; m.calc_tangents(); return [r(sum(l.tangent[0] for l in m.loops)), r(sum(l.bitangent_sign for l in m.loops))]
t('tangents', tang)
def area():
    o = mk('monkey'); return [r(sum(p.area for p in o.data.polygons)), r(sum(p.center.z for p in o.data.polygons)), r(sum(p.normal.x for p in o.data.polygons))]
t('polyarea', area)
def attrs():
    o = mk('cube'); a = o.data.attributes.new('w', 'FLOAT', 'POINT'); a.data.foreach_set('value', [i * .5 for i in range(8)]); b = o.data.attributes.new('c', 'FLOAT_COLOR', 'CORNER'); return [len(a.data), len(b.data), r(sum(x.value for x in a.data))]
t('attrs', attrs)
def evalmods():
    o = mk('cube'); m = o.modifiers.new('s', 'SUBSURF'); m.levels = 3; ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); res = [len(me.vertices), len(me.polygons), r(sum(v.co.x ** 2 for v in me.vertices))]; ev.to_mesh_clear(); return res
t('subsurf_eval', evalmods)
def shape():
    o = mk('cube'); o.shape_key_add(name='B'); k = o.shape_key_add(name='K'); k.data[0].co.z += 2; k.value = .5; o.data.update(); ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); z = r(max(v.co.z for v in me.vertices)); ev.to_mesh_clear(); return z
t('shapekey', shape)
def vgrp():
    o = mk('cube'); g = o.vertex_groups.new(name='g'); g.add([0, 1, 2], .75, 'REPLACE'); return [r(g.weight(1)), len([v for v in o.data.vertices if v.groups])]
t('vgroup', vgrp)
def curve():
    bpy.ops.curve.primitive_bezier_circle_add(); c = bpy.context.object; sp = c.data.splines[0]; return [len(sp.bezier_points), r(sp.calc_length() if hasattr(sp, 'calc_length') else 0)]
t('curve', curve)
def uvbm():
    o = mk('cube'); bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); l = bm.faces[0].loops[0]; res = [r(bm.calc_volume()), r(bm.calc_loop_triangles().__len__())]; bm.free(); return res
t('bmvol', uvbm)
