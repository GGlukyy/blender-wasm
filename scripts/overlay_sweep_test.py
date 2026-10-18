# Lov chyb kolo 66: přepne spoustu overlayů/shading módů ve 3D viewportu a hlásí vše, co spadne při kreslení
# (hledá se pak v plném logu: translate FAILED / shaderc FAIL / ICE). Běží přes ops_test.mjs s OPS_ALL=1.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
ob.modifiers.new('S', 'SUBSURF')
bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.ops.object.shade_smooth()
bpy.ops.object.armature_add(location=(-3, 0, 0))
bpy.ops.object.light_add(type='POINT', location=(0, -3, 3)); bpy.ops.object.camera_add(location=(0, -8, 2), rotation=(1.4, 0, 0))
bpy.context.view_layer.objects.active = ob
def v3d():
    win = bpy.context.window_manager.windows[0]
    a = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); return a.spaces.active
STEPS = []
def S(name, fn): STEPS.append((name, fn))
sp = None
for t in ('WIREFRAME', 'SOLID', 'MATERIAL', 'RENDERED', 'SOLID'):
    S('shading=' + t, lambda t=t: setattr(v3d().shading, 'type', t))
for lt in ('FLAT', 'STUDIO', 'MATCAP'):
    S('light=' + lt, lambda lt=lt: setattr(v3d().shading, 'light', lt))
for ct in ('MATERIAL', 'OBJECT', 'RANDOM', 'VERTEX', 'SINGLE', 'TEXTURE'):
    S('color=' + ct, lambda ct=ct: setattr(v3d().shading, 'color_type', ct))
for fl in ('show_cavity', 'show_shadows', 'show_xray', 'show_object_outline', 'show_specular_highlight', 'use_dof'):
    S(fl + '=1', lambda fl=fl: setattr(v3d().shading, fl, True) if hasattr(v3d().shading, fl) else None)
S('cavity ridge', lambda: setattr(v3d().shading, 'cavity_type', 'BOTH'))
for fl in ('show_wireframes', 'show_face_orientation', 'show_bones', 'show_outline_selected', 'show_relationship_lines', 'show_text', 'show_stats', 'show_cursor', 'show_extras', 'show_floor', 'show_axis_x', 'show_axis_y', 'show_ortho_grid'):
    S('overlay.' + fl, lambda fl=fl: setattr(v3d().overlay, fl, not getattr(v3d().overlay, fl)) if hasattr(v3d().overlay, fl) else None)
S('EDIT', lambda: bpy.ops.object.mode_set(mode='EDIT'))
for fl in ('show_edge_seams', 'show_edge_sharp', 'show_edge_crease', 'show_edge_bevel_weight', 'show_face_orientation', 'show_extra_edge_length', 'show_extra_edge_angle', 'show_extra_face_angle', 'show_extra_face_area', 'show_extra_indices', 'show_vertex_normals', 'show_split_normals', 'show_face_normals', 'show_freestyle_edge_marks', 'show_freestyle_face_marks', 'show_retopology', 'show_statvis', 'show_weight'):
    S('edit.' + fl, lambda fl=fl: setattr(v3d().overlay, fl, True) if hasattr(v3d().overlay, fl) else None)
for mode in ('OVERHANG', 'THICKNESS', 'INTERSECT', 'DISTORT', 'SHARP'):
    S('statvis ' + mode, lambda mode=mode: (setattr(bpy.context.scene.tool_settings.statvis, 'type', mode), setattr(v3d().overlay, 'show_statvis', True)))
for m in ('VERT', 'EDGE', 'FACE'):
    S('selmode ' + m, lambda m=m: bpy.ops.mesh.select_mode(type=m))
S('select all', lambda: bpy.ops.mesh.select_all(action='SELECT'))
S('xray edit', lambda: setattr(v3d().shading, 'show_xray', True))
S('OBJECT', lambda: bpy.ops.object.mode_set(mode='OBJECT'))
for md in ('SCULPT', 'VERTEX_PAINT', 'WEIGHT_PAINT', 'TEXTURE_PAINT'):
    S('mode ' + md, lambda md=md: bpy.ops.object.mode_set(mode=md))
    S('back', lambda: bpy.ops.object.mode_set(mode='OBJECT'))
S('POSE', lambda: (bpy.context.view_layer.objects.__setattr__('active', bpy.data.objects.get('Armature')), bpy.ops.object.mode_set(mode='POSE')))
S('OBJECT2', lambda: bpy.ops.object.mode_set(mode='OBJECT'))
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(STEPS):
        out('OPS_DONE'); return None
    name, fn = STEPS[i]; state['i'] += 1
    try:
        fn(); out('OPS sweep ok', name)
    except Exception as e:
        out('OPS sweep ERR', name, type(e).__name__, str(e)[:100])
    return 0.8
bpy.app.timers.register(tick, first_interval=1.5)
