import bpy, sys, gc
def out(*a):
    print(*a); sys.stdout.flush()
O = bpy.ops
MODE = 'full'
def cycle(i):
    O.object.select_all(action='SELECT'); O.object.delete()
    O.mesh.primitive_uv_sphere_add(segments=64, ring_count=32); ob = bpy.context.object
    if MODE in ('full', 'nopush', 'nodup', 'sub'):
        m = ob.modifiers.new('S', 'SUBSURF'); m.levels = 2; O.object.modifier_apply(modifier='S')
    if MODE in ('full', 'nopush', 'nodup'):
        O.object.mode_set(mode='EDIT'); O.mesh.select_all(action='SELECT'); O.mesh.bevel(offset=0.002); O.mesh.subdivide(); O.object.mode_set(mode='OBJECT')
    if MODE in ('full', 'nopush'):
        O.object.duplicate(); O.object.join()
    if MODE == 'full':
        O.ed.undo_push(message='c%d' % i)
    O.object.select_all(action='SELECT'); O.object.delete()
    O.outliner.orphans_purge(do_recursive=True)
st = {'i': 0}
def tick():
    cycle(st['i']); st['i'] += 1
    out('OPS leak cycle', st['i'], len(bpy.data.meshes), len(bpy.data.objects))
    if st['i'] >= 25:
        out('OPS_DONE'); return None
    return 0.05
bpy.app.timers.register(tick, first_interval=1.0)
