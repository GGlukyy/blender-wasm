import bpy, sys
def out(*a): print(*a); sys.stdout.flush()
def run():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_uv_sphere_add(); ob = bpy.context.object
    for mode, kw in (('COLLAPSE', {'ratio': 0.3}), ('UNSUBDIV', {'iterations': 1}), ('DISSOLVE', {'angle_limit': 0.2})):
        for m in list(ob.modifiers): ob.modifiers.remove(m)
        d = ob.modifiers.new('D', 'DECIMATE'); d.decimate_type = mode
        for k, v in kw.items(): setattr(d, k, v)
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        out('OPS dec', mode, 'verts', len(ev.data.vertices), 'polys', len(ev.data.polygons), 'orig', len(ob.data.polygons), 'face_count', getattr(d, 'face_count', None))
    out('OPS_DONE failed=0 total=0')
    return None
bpy.app.timers.register(run, first_interval=6.0)
