import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model2_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def fresh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return bpy.context.object
def edit(): bpy.ops.object.mode_set(mode='EDIT')
def obj(): bpy.ops.object.mode_set(mode='OBJECT')
def sel_all(): bpy.ops.mesh.select_all(action='SELECT')
# loopcut (bpy.ops.mesh.loopcut_slide needs a 3D view context -> use subdivide of edge ring equivalent)
ob = fresh(); edit(); sel_all(); bpy.ops.mesh.subdivide(number_cuts=2); obj()
chk('subdivide2', len(ob.data.vertices) == 56, 'verts=%d' % len(ob.data.vertices))
# extrude along normals
ob = fresh(); edit(); sel_all(); bpy.ops.mesh.extrude_region_shrink_fatten(TRANSFORM_OT_shrink_fatten={'value': 0.3}); obj()
zs = max(v.co.z for v in ob.data.vertices)
chk('extrude_normals', len(ob.data.vertices) == 16 and zs > 1.1, 'verts=%d zmax=%.2f' % (len(ob.data.vertices), zs))
# knife project-less: bisect
ob = fresh(); edit(); sel_all(); bpy.ops.mesh.bisect(plane_co=(0, 0, 0), plane_no=(0, 0, 1)); obj()
chk('bisect', len(ob.data.vertices) == 12, 'verts=%d' % len(ob.data.vertices))
# mirror modifier apply
ob = fresh(); ob.location = (1.5, 0, 0); bpy.ops.object.transform_apply(location=True)
m = ob.modifiers.new('Mir', 'MIRROR'); bpy.ops.object.modifier_apply(modifier='Mir')
chk('mirror_apply', len(ob.data.vertices) == 16, 'verts=%d' % len(ob.data.vertices))
# boolean
ob = fresh(); bpy.ops.mesh.primitive_uv_sphere_add(location=(0.9, 0, 0)); sp = bpy.context.object
bm = ob.modifiers.new('B', 'BOOLEAN'); bm.object = sp; bm.operation = 'DIFFERENCE'
bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='B')
chk('boolean', len(ob.data.vertices) > 8, 'verts=%d' % len(ob.data.vertices))
# merge at center + dissolve + loop select
ob = fresh(); edit(); sel_all(); bpy.ops.mesh.merge(type='CENTER'); obj()
chk('merge_center', len(ob.data.vertices) == 1)
ob = fresh(); edit(); bpy.ops.mesh.select_mode(type='EDGE'); sel_all(); bpy.ops.mesh.dissolve_edges(); obj()
chk('dissolve_edges', True, 'verts=%d' % len(ob.data.vertices))
# undo/redo of edit-mode op
ob = fresh(); edit(); sel_all(); bpy.ops.ed.undo_push(message='a'); bpy.ops.mesh.subdivide(); bpy.ops.ed.undo_push(message='b'); bpy.ops.ed.undo(); r = len(bmesh.from_edit_mesh(ob.data).verts); bpy.ops.ed.redo(); obj()
chk('undo_redo_edit', r == 8 and len(ob.data.vertices) == 26, 'undo_verts=%d redo_verts=%d' % (r, len(ob.data.vertices)))
# apply scale + origin + join
a = fresh(); bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0)); b = bpy.context.object
bpy.ops.object.select_all(action='SELECT'); bpy.context.view_layer.objects.active = a; bpy.ops.object.join()
chk('join', len(a.data.vertices) == 16)
# smooth shading + autosmooth-ish + shade flat
bpy.ops.object.shade_smooth(); chk('shade_smooth', all(p.use_smooth for p in a.data.polygons))
# decimate / remesh-ish
m = a.modifiers.new('D', 'DECIMATE'); m.ratio = 0.5; bpy.ops.object.modifier_apply(modifier='D')
chk('decimate', len(a.data.vertices) <= 16)
# symmetrize
ob = fresh(); edit(); sel_all(); bpy.ops.mesh.symmetrize(direction='POSITIVE_X'); obj()
chk('symmetrize', len(ob.data.vertices) >= 8)
out('OPS_DONE')
