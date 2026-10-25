import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
for n, mk in (('cube', lambda: bpy.ops.mesh.primitive_cube_add()), ('uv16', lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)), ('uv32', lambda: bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16))):
    mk(); ob = bpy.context.object
    t = time.time(); m = ob.modifiers.new('S', 'SKIN'); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='S'); out('OPS skin', n, len(ob.data.vertices), round(time.time() - t, 2))
out('OPS_DONE')
