import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_uv_sphere_add(segments=100, ring_count=100); ob = bpy.context.object
out('OPS prof verts', len(ob.data.vertices))
t = time.time(); dg = bpy.context.evaluated_depsgraph_get(); out('OPS prof depsgraph_first', round(time.time() - t, 2))
t = time.time(); dg.update(); out('OPS prof depsgraph_update', round(time.time() - t, 2))
t = time.time(); m = ob.modifiers.new('S', 'SUBSURF'); m.levels = 1; out('OPS prof add_mod', round(time.time() - t, 2))
t = time.time(); dg = bpy.context.evaluated_depsgraph_get(); out('OPS prof A get_depsgraph', round(time.time() - t, 2))
t = time.time(); ev = ob.evaluated_get(dg); out('OPS prof B evaluated_get', round(time.time() - t, 2))
t = time.time(); me = ev.to_mesh(); out('OPS prof C to_mesh', len(me.vertices), round(time.time() - t, 2)); ev.to_mesh_clear()
t = time.time(); dg.update(); ev = ob.evaluated_get(dg); me = ev.to_mesh(); out('OPS prof eval_again', round(time.time() - t, 2)); ev.to_mesh_clear()
m.levels = 2
t = time.time(); dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); me = ev.to_mesh(); out('OPS prof eval_lvl2', len(me.vertices), round(time.time() - t, 2)); ev.to_mesh_clear()
m.levels = 1
t = time.time(); bpy.ops.ed.undo_push(message='x'); out('OPS prof undo_push', round(time.time() - t, 2))
t = time.time(); bpy.ops.object.modifier_apply(modifier='S'); out('OPS prof apply', len(ob.data.vertices), round(time.time() - t, 2))
t = time.time(); bpy.ops.object.shade_smooth(); out('OPS prof shade_smooth', round(time.time() - t, 2))
out('OPS_DONE')
