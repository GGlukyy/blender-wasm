import bpy
if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
bpy.ops.mesh.primitive_monkey_add(); o=bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project()
bpy.ops.object.mode_set(mode='OBJECT'); uv=o.data.uv_layers.active.data
_MK=[(round(l.uv[0],4),round(l.uv[1],4)) for l in uv]
