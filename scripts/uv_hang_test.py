# Opakování 3 UV operátorů, které v čistém Python exec zamrzly (select_edge_ring, select_overlap, stitch), uvnitř skutečné UV oblasti.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(); bpy.ops.uv.select_all(action='SELECT')
win = bpy.context.window_manager.windows[0]
bpy.context.window.workspace = bpy.data.workspaces['UV Editing']
state = {'i': 0}
ops = ['select_edge_ring', 'select_overlap', 'stitch']
def tick():
    i = state['i']
    if i >= len(ops):
        out('OPS_DONE'); return None
    name = ops[i]; state['i'] += 1
    try:
        area = next(a for a in bpy.context.window.screen.areas if a.type == 'IMAGE_EDITOR'); reg = next(r for r in area.regions if r.type == 'WINDOW')
        out('OPS uvhang try', name)
        with bpy.context.temp_override(window=bpy.context.window, area=area, region=reg):
            r = getattr(bpy.ops.uv, name)()
        out('OPS uvhang ok', name, r)
    except BaseException as e:
        out('OPS uvhang ERR', name, type(e).__name__, str(e)[:100])
    return 1.0
bpy.app.timers.register(tick, first_interval=3.0)
