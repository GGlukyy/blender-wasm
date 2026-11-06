# Stejné operace jako journey_test.mjs v desktop Blenderu: blender.exe -b --factory-startup --python journey_desktop.py
import bpy, bmesh
ob = bpy.data.objects['Cube']; bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
bm = bmesh.from_edit_mesh(ob.data); max(bm.faces, key=lambda f: f.calc_center_median().z).select_set(True); bmesh.update_edit_mesh(ob.data)
def st(t):
    ob.update_from_editmode(); d = ob.data; print('DESK', t, 'v', len(d.vertices), 'e', len(d.edges), 'f', len(d.polygons), 'zmax', round(max(x.co.z for x in d.vertices), 3))
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, 1)}); st('extrude')
bpy.ops.mesh.inset(thickness=0.2); st('inset')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, -0.5)}); st('extrude2')
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.mesh.primitive_uv_sphere_add(); print('DESK sphere v', len(bpy.context.object.data.vertices))
