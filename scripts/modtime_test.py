import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
def run(typ, **kw):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64); ob = bpy.context.object  # ~8k quads
    m = ob.modifiers.new('M', typ)
    for k, v in kw.items(): setattr(m, k, v)
    t = time.time(); d = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(d); n = len(e.to_mesh().vertices); dt = time.time() - t
    out('OPS modtime_%s %s t=%.2fs verts=%d' % (typ, 'PASS' if dt < 5 else 'FAIL', dt, n))
for typ, kw in [('BEVEL', {'width': 0.01, 'limit_method': 'NONE'}), ('DECIMATE', {'ratio': 0.3}), ('SOLIDIFY', {'thickness': 0.05}), ('SMOOTH', {'iterations': 10}),
                ('WIREFRAME', {}), ('TRIANGULATE', {}), ('SUBSURF', {'levels': 2}), ('MIRROR', {}), ('ARRAY', {'count': 10}), ('REMESH', {'mode': 'SMOOTH', 'octree_depth': 6}),
                ('DISPLACE', {}), ('CORRECTIVE_SMOOTH', {}), ('LAPLACIANSMOOTH', {}), ('SHRINKWRAP', {}), ('WELD', {}), ('EDGE_SPLIT', {}), ('WEIGHTED_NORMAL', {})]:
    try: run(typ, **kw)
    except Exception as ex: out('OPS modtime_%s FAIL exc=%s' % (typ, str(ex)[:100]))
out('OPS_DONE')
