# bmesh.ops (desktop 5.3.0, journey `bmeshops`): `_BM` = [v,e,f].
import bpy, bmesh
from mathutils import Vector, Matrix
_BM = {}
def t(name, prim, fn):
    try:
        bm = bmesh.new(); getattr(bmesh.ops, 'create_' + prim)(bm, **({'size': 1.0} if prim == 'cube' else {})) if prim == 'cube' else None
        if prim == 'monkey': bmesh.ops.create_monkey(bm)
        fn(bm); _BM[name] = [len(bm.verts), len(bm.edges), len(bm.faces)]; bm.free()
    except Exception as e: _BM[name] = 'ERR ' + str(e)[:80]
t('subdiv', 'cube', lambda b: bmesh.ops.subdivide_edges(b, edges=b.edges[:], cuts=2, use_grid_fill=True))
t('bevel', 'cube', lambda b: bmesh.ops.bevel(b, geom=b.edges[:], offset=0.1, segments=2, affect='EDGES'))
t('inset_region', 'cube', lambda b: bmesh.ops.inset_region(b, faces=b.faces[:], thickness=0.1))
t('extrude', 'cube', lambda b: bmesh.ops.extrude_face_region(b, geom=b.faces[:1]))
t('dissolve_faces', 'cube', lambda b: bmesh.ops.dissolve_faces(b, faces=b.faces[:2]))
t('triangulate', 'cube', lambda b: bmesh.ops.triangulate(b, faces=b.faces[:]))
t('poke', 'cube', lambda b: bmesh.ops.poke(b, faces=b.faces[:]))
t('remove_doubles', 'cube', lambda b: (bmesh.ops.duplicate(b, geom=b.verts[:] + b.edges[:] + b.faces[:]), bmesh.ops.remove_doubles(b, verts=b.verts[:], dist=0.001)))
t('convex_hull', 'monkey', lambda b: bmesh.ops.convex_hull(b, input=b.verts[:]))
t('delaunay', 'cube', lambda b: bmesh.ops.delete(b, geom=b.faces[:], context='FACES_ONLY'))
t('spin', 'cube', lambda b: bmesh.ops.spin(b, geom=b.verts[:1], cent=(2, 0, 0), axis=(0, 0, 1), angle=6.2831853, steps=8))
t('solidify', 'cube', lambda b: bmesh.ops.solidify(b, geom=b.faces[:], thickness=0.1))
t('wireframe', 'cube', lambda b: bmesh.ops.wireframe(b, faces=b.faces[:], thickness=0.05))
t('mirror', 'cube', lambda b: bmesh.ops.mirror(b, geom=b.verts[:] + b.edges[:] + b.faces[:], axis='X', merge_dist=0.001))
t('recalc', 'monkey', lambda b: bmesh.ops.recalc_face_normals(b, faces=b.faces[:]))
