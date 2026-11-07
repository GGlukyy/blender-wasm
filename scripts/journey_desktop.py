# Stejné operace jako journey_test.mjs v desktop Blenderu: blender.exe -b --factory-startup --python journey_desktop.py
# Desktop: "/mnt/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" (Steam, 5.2.3 LTS).
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
# Cesta donut: torus + G Z 0.3 s proportional, dosah 1.1 (web: 576/1152/576, pohne 174 vrcholy).
bpy.ops.mesh.primitive_torus_add(); t = bpy.context.object; d = t.data; print('DESK torus', len(d.vertices), len(d.edges), len(d.polygons))
z0 = [v.co.z for v in d.vertices]
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='VERT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT'); d.vertices[0].select = True; bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.transform.translate(value=(0, 0, 0.3), use_proportional_edit=True, proportional_size=1.1, proportional_edit_falloff='SMOOTH')
t.update_from_editmode(); print('DESK proportional moved', sum(abs(v.co.z - z) > 1e-4 for v, z in zip(d.vertices, z0)))
# Cesty 7. 11.: text3d, curve, rename (Ctrl+J), script (opice).
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.read_factory_settings(use_empty=False)
bpy.ops.object.text_add(); t = bpy.context.object; print('DESK text', repr(t.data.body), t.type)
bpy.ops.curve.primitive_bezier_curve_add(); c = bpy.context.object; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.curve.select_all(action='SELECT'); bpy.ops.curve.extrude_move(TRANSFORM_OT_translate={'value': (1, 0, 0)}); bpy.ops.object.mode_set(mode='OBJECT'); print('DESK curve pts', len(c.data.splines[0].bezier_points))
bpy.ops.object.convert(target='MESH'); print('DESK curve mesh v', len(bpy.context.object.data.vertices))
bpy.ops.wm.read_factory_settings(use_empty=False)
n = len(bpy.data.objects); bpy.ops.mesh.primitive_monkey_add(location=(0, 3, 0)); print('DESK monkey objs', n, '->', len(bpy.data.objects), 'v', len(bpy.context.object.data.vertices))
bpy.ops.wm.read_factory_settings(use_empty=False)
a = bpy.data.objects['Cube']; bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)); a.select_set(True); bpy.ops.object.join(); print('DESK join objs', len(bpy.data.objects), 'v', len(bpy.context.object.data.vertices))
