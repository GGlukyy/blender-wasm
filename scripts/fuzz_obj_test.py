# Fuzz objektového režimu: modifikátory (přidat/aplikovat/odebrat), duplikace, join, shade, undo/redo, módy sculpt/weight/vertex paint.
import bpy, random, sys
def out(*a):
    print(*a); sys.stdout.flush()
SEED = 7; N = 400
rnd = random.Random(SEED); O = bpy.ops
O.object.select_all(action='SELECT'); O.object.delete(); O.mesh.primitive_cube_add()
MODS = ['SUBSURF', 'MIRROR', 'BEVEL', 'SOLIDIFY', 'ARRAY', 'DECIMATE', 'WIREFRAME', 'TRIANGULATE', 'EDGE_SPLIT', 'REMESH', 'SMOOTH', 'WEIGHTED_NORMAL', 'SIMPLE_DEFORM', 'TWIST' if False else 'WELD']
st = {'i': 0, 'err': 0, 'n': 0}
def act():
    ob = bpy.context.view_layer.objects.active
    if ob is None or ob.type != 'MESH':
        O.object.select_all(action='SELECT'); O.object.delete(); O.mesh.primitive_cube_add(); ob = bpy.context.view_layer.objects.active
    if ob.mode != 'OBJECT': O.object.mode_set(mode='OBJECT')
    vs = len(ob.data.vertices)
    r = rnd.random()
    if vs > 30000: O.object.delete(); O.mesh.primitive_cube_add(); return
    if r < 0.2:
        m = ob.modifiers.new('M%d' % st['i'], rnd.choice(MODS))
        if m.type == 'REMESH': m.octree_depth = 3
        if m.type == 'SUBSURF': m.levels = 1
        if m.type == 'ARRAY': m.count = 2
    elif r < 0.32 and ob.modifiers:
        with bpy.context.temp_override(object=ob, active_object=ob): O.object.modifier_apply(modifier=ob.modifiers[0].name)
    elif r < 0.4 and ob.modifiers: ob.modifiers.remove(ob.modifiers[-1])
    elif r < 0.5: O.object.duplicate_move()
    elif r < 0.55: O.object.join()
    elif r < 0.6: O.object.shade_smooth()
    elif r < 0.7: O.ed.undo()
    elif r < 0.75: O.ed.redo()
    elif r < 0.8:
        O.object.mode_set(mode=rnd.choice(['SCULPT', 'VERTEX_PAINT', 'WEIGHT_PAINT', 'EDIT', 'TEXTURE_PAINT'])); O.object.mode_set(mode='OBJECT')
    elif r < 0.85: O.object.origin_set(type='ORIGIN_GEOMETRY')
    elif r < 0.9: O.object.transform_apply()
    elif r < 0.95: O.object.convert(target='MESH')
    else: O.mesh.primitive_uv_sphere_add(segments=8, ring_count=4)
def step():
    for _ in range(10):
        if st['i'] >= N:
            out('OPS fuzz_obj PASS ops=%d operator_errors=%d' % (st['n'], st['err'])); out('OPS_DONE'); return None
        st['i'] += 1
        try: act(); st['n'] += 1
        except (RuntimeError, ReferenceError, TypeError, AttributeError): st['err'] += 1
    return 0.05
bpy.app.timers.register(step, first_interval=0.5)
