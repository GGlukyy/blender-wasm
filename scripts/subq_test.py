import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
def run(label, **kw):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5); ob = bpy.context.object  # ~10k tris
    m = ob.modifiers.new('S', 'SUBSURF'); m.levels = 1
    for k, v in kw.items(): setattr(m, k, v)
    t = time.time(); d = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(d); n = len(e.to_mesh().vertices)
    out('OPS subq_%s PASS t=%.2fs verts=%d' % (label, time.time() - t, n))
run('default')
run('nolimit', use_limit_surface=False)
run('quality1', quality=1)
run('nolimit_q1', use_limit_surface=False, quality=1)
out('OPS_DONE')
