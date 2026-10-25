import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
def fresh(seg=100, rings=100):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings); return bpy.context.object
def T(name, fn):
    t = time.time()
    try: fn(); ok = 'ok'
    except Exception as e: ok = 'ERR ' + str(e)[:60]
    dt = time.time() - t
    out('OPS optime %-22s %6.2f s %s %s' % (name, dt, ok, 'SLOW' if dt > 2 else ''))
def mod(ob, typ, **kw):
    def f():
        m = ob.modifiers.new('M', typ)
        for k, v in kw.items(): setattr(m, k, v)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier='M')
    return f
ob = fresh(); out('OPS optime verts', len(ob.data.vertices))
for typ, kw in [('SUBSURF', dict(levels=2)), ('BEVEL', dict(width=0.01, segments=2)), ('SOLIDIFY', dict(thickness=0.05)), ('MIRROR', {}), ('ARRAY', dict(count=3)),
                ('DECIMATE', dict(ratio=0.3)), ('REMESH', dict(mode='SMOOTH', octree_depth=6)), ('SMOOTH', dict(iterations=5)), ('TRIANGULATE', {}), ('WIREFRAME', dict(thickness=0.02)),
                ('DISPLACE', {}), ('SHRINKWRAP', {}), ('WELD', {}), ('EDGE_SPLIT', {}), ('SCREW', {})]:
    ob = fresh(60, 60)
    T('mod_' + typ, mod(ob, typ, **kw))
ob = fresh()
def edit_op(fn):
    def f():
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); fn(); bpy.ops.object.mode_set(mode='OBJECT')
    return f
T('edit_subdivide', edit_op(lambda: bpy.ops.mesh.subdivide(number_cuts=1)))
ob = fresh(); T('edit_bevel', edit_op(lambda: bpy.ops.mesh.bevel(offset=0.005, segments=2)))
ob = fresh(); T('edit_inset', edit_op(lambda: bpy.ops.mesh.inset(thickness=0.01)))
ob = fresh(); T('edit_extrude', edit_op(lambda: bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, 0.1)})))
ob = fresh(); T('edit_remove_doubles', edit_op(lambda: bpy.ops.mesh.remove_doubles()))
ob = fresh(); T('edit_triangulate', edit_op(lambda: bpy.ops.mesh.quads_convert_to_tris()))
ob = fresh(); T('edit_tris_to_quads', edit_op(lambda: (bpy.ops.mesh.quads_convert_to_tris(), bpy.ops.mesh.tris_convert_to_quads())))
ob = fresh(); T('edit_smooth_verts', edit_op(lambda: bpy.ops.mesh.vertices_smooth(repeat=5)))
ob = fresh(); T('edit_normals_recalc', edit_op(lambda: bpy.ops.mesh.normals_make_consistent()))
ob = fresh(); T('edit_smart_uv', edit_op(lambda: bpy.ops.uv.smart_project()))
ob = fresh(); T('edit_unwrap', edit_op(lambda: bpy.ops.uv.unwrap(method='ANGLE_BASED')))
ob = fresh(); T('edit_separate', edit_op(lambda: bpy.ops.mesh.separate(type='LOOSE')))
ob = fresh(); T('voxel_remesh', lambda: bpy.ops.object.voxel_remesh())
ob = fresh(); T('shade_smooth', lambda: bpy.ops.object.shade_smooth())
ob = fresh(); T('shade_auto_smooth', lambda: bpy.ops.object.shade_auto_smooth())
ob = fresh(); T('duplicate', lambda: bpy.ops.object.duplicate())
ob = fresh(); T('sculpt_mode_enter', lambda: (bpy.ops.object.mode_set(mode='SCULPT'), bpy.ops.object.mode_set(mode='OBJECT')))
ob = fresh(); T('save_blend', lambda: bpy.ops.wm.save_as_mainfile(filepath='/opfs/home/optime.blend'))
T('open_blend', lambda: bpy.ops.wm.open_mainfile(filepath='/opfs/home/optime.blend'))
out('OPS_DONE')
