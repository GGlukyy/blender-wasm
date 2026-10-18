# Lov chyb kolo 66: sculpt režim — maska, face sets, dyntopo, multires, viditelnost + overlaye v různých shading módech; hledá nepřeložené shadery/pády.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16); ob = bpy.context.object; bpy.ops.object.shade_smooth()
win = bpy.context.window_manager.windows[0]
area = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0]; reg = [r for r in area.regions if r.type == 'WINDOW'][0]; v3d = area.spaces.active
def ovr(): return bpy.context.temp_override(window=win, area=area, region=reg)
S = []
def step(name, fn): S.append((name, fn))
step('sculpt mode', lambda: bpy.ops.object.mode_set(mode='SCULPT'))
step('mask flood', lambda: [bpy.ops.paint.mask_flood_fill(mode='VALUE', value=0.5)] if True else None)
step('overlay mask', lambda: setattr(v3d.overlay, 'show_sculpt_mask', True))
step('face sets', lambda: setattr(v3d.overlay, 'show_sculpt_face_sets', True))
step('face set init', lambda: bpy.ops.sculpt.face_sets_init(mode='LOOSE_PARTS'))
step('face set random', lambda: bpy.ops.sculpt.face_sets_randomize_colors())
step('face set hide', lambda: bpy.ops.sculpt.face_set_change_visibility(mode='HIDE_ACTIVE'))
step('reveal', lambda: bpy.ops.sculpt.reveal_all() if hasattr(bpy.ops.sculpt, 'reveal_all') else None)
step('dyntopo on', lambda: bpy.ops.sculpt.dynamic_topology_toggle())
step('dyntopo off', lambda: bpy.ops.sculpt.dynamic_topology_toggle())
step('mesh filter', lambda: bpy.ops.sculpt.mesh_filter(type='INFLATE', strength=0.1) if False else None)
step('symmetrize', lambda: bpy.ops.sculpt.symmetrize())
step('voxel remesh', lambda: None)
for t in ('MATERIAL', 'WIREFRAME', 'SOLID'):
    step('shading ' + t, lambda t=t: setattr(v3d.shading, 'type', t))
step('xray', lambda: setattr(v3d.shading, 'show_xray', True))
step('object mode', lambda: bpy.ops.object.mode_set(mode='OBJECT'))
step('multires', lambda: (ob.modifiers.new('M', 'MULTIRES'), bpy.ops.object.multires_subdivide(modifier='M', mode='CATMULL_CLARK')))
step('sculpt multires', lambda: bpy.ops.object.mode_set(mode='SCULPT'))
step('mask on multires', lambda: bpy.ops.paint.mask_flood_fill(mode='VALUE', value=0.3))
step('vertex paint', lambda: (bpy.ops.object.mode_set(mode='OBJECT'), bpy.ops.object.mode_set(mode='VERTEX_PAINT')))
step('weight paint', lambda: (bpy.ops.object.mode_set(mode='OBJECT'), bpy.ops.object.mode_set(mode='WEIGHT_PAINT')))
step('texture paint', lambda: (bpy.ops.object.mode_set(mode='OBJECT'), bpy.ops.object.mode_set(mode='TEXTURE_PAINT')))
step('object', lambda: bpy.ops.object.mode_set(mode='OBJECT'))
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(S):
        out('OPS_DONE'); return None
    n, fn = S[i]; state['i'] += 1
    out('OPS sculpt_draw try', n)
    try:
        with ovr(): fn()
    except BaseException as e:
        out('OPS sculpt_draw ERR', n, type(e).__name__, str(e)[:100])
    return 0.8
bpy.app.timers.register(tick, first_interval=1.5)
