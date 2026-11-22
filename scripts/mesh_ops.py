# Edit-mode operátory meshe (desktop 5.3.0 počty v journey `meshops`): výsledek v `_MO`.
import bpy, bmesh
_MO = {}
def fresh():
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); return o
def cnt(o):
    bpy.ops.object.mode_set(mode='OBJECT'); d = o.data; return [len(d.vertices), len(d.edges), len(d.polygons)]
def t(name, fn):
    try: o = fresh(); fn(o); _MO[name] = cnt(o)
    except Exception as e: _MO[name] = 'ERR ' + str(e)[:80]
t('poke', lambda o: bpy.ops.mesh.poke())
t('tris', lambda o: bpy.ops.mesh.quads_convert_to_tris())
t('tris2quads', lambda o: (bpy.ops.mesh.quads_convert_to_tris(), bpy.ops.mesh.tris_convert_to_quads()))
t('subdiv3', lambda o: bpy.ops.mesh.subdivide(number_cuts=3))
t('bevel', lambda o: bpy.ops.mesh.bevel(offset=0.1, segments=2))
t('inset', lambda o: bpy.ops.mesh.inset(thickness=0.2))
t('wireframe', lambda o: bpy.ops.mesh.wireframe(thickness=0.05))
t('solidify', lambda o: bpy.ops.mesh.solidify(thickness=0.1))
t('spin', lambda o: (bpy.ops.mesh.select_all(action='DESELECT'), bpy.ops.object.mode_set(mode='OBJECT'), setattr(o.data.vertices[0], 'select', True), bpy.ops.object.mode_set(mode='EDIT'), bpy.ops.mesh.spin(steps=8, angle=6.2831853, center=(2, 0, 0), axis=(0, 0, 1))))
t('dissolve', lambda o: bpy.ops.mesh.dissolve_limited())
t('unsubdiv', lambda o: (bpy.ops.mesh.subdivide(number_cuts=1), bpy.ops.mesh.select_all(action='SELECT'), bpy.ops.mesh.unsubdivide(iterations=1)))
t('separate', lambda o: (bpy.ops.mesh.duplicate(), bpy.ops.mesh.separate(type='SELECTED')))
t('edgering', lambda o: (bpy.ops.mesh.delete(type='ONLY_FACE'), bpy.ops.mesh.edge_face_add()))
t('flip', lambda o: bpy.ops.mesh.flip_normals())
t('rip', lambda o: bpy.ops.mesh.split())
