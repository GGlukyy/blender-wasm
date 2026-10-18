# Lov chyb kolo 66: každý typ modifikátoru na Suzanne (+ pomocné objekty) → vyhodnotit mesh, hlásit výjimky/prázdný výsledek.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); mk = bpy.context.object
bpy.ops.mesh.primitive_uv_sphere_add(location=(2, 0, 0), radius=0.5); helper = bpy.context.object
bpy.ops.object.empty_add(location=(0, 0, 1)); empty = bpy.context.object
bpy.ops.curve.primitive_bezier_curve_add(location=(0, 2, 0)); curve = bpy.context.object
bpy.ops.object.armature_add(location=(0, -2, 0)); arm = bpy.context.object
bpy.context.view_layer.objects.active = mk; mk.select_set(True)
types = [it.identifier for it in bpy.types.Modifier.bl_rna.properties['type'].enum_items]
out('OPS_INFO modifier types', len(types))
skip = {'COLLISION', 'CLOTH', 'SOFT_BODY', 'FLUID', 'DYNAMIC_PAINT', 'PARTICLE_SYSTEM', 'OCEAN', 'SIMULATION', 'NODES'}
def base_polys():
    return len(mk.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
n0 = len(mk.data.polygons); out('OPS_INFO base polys', n0)
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(types):
        out('OPS_DONE'); return None
    t = types[i]; state['i'] += 1
    if t in skip:
        out('OPS mod_sweep skip', t); return 0.3
    try:
        for m in list(mk.modifiers): mk.modifiers.remove(m)
        m = mk.modifiers.new('T', t)
        if hasattr(m, 'object') and t in ('BOOLEAN',): m.object = helper
        if hasattr(m, 'target') and t in ('SHRINKWRAP',): m.target = helper
        if t in ('CURVE',): m.object = curve
        if t in ('ARMATURE',): m.object = arm
        if t in ('HOOK', 'LATTICE'): pass
        if t == 'ARRAY' and hasattr(m, 'offset_object'): pass
        ev = mk.evaluated_get(bpy.context.evaluated_depsgraph_get()); np_ = len(ev.data.polygons); nv = len(ev.data.vertices)
        out('OPS mod_sweep ok', t, 'polys', np_, 'verts', nv)
    except BaseException as e:
        out('OPS mod_sweep ERR', t, type(e).__name__, str(e)[:100])
    return 0.4
bpy.app.timers.register(tick, first_interval=1.5)
