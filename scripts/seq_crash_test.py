# Repro: SEQUENCE_EDITOR + proxy_render_size = 'NONE' → "memory access out of bounds"? (space_sweep)
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene; sc.sequence_editor_create()
win = bpy.context.window_manager.windows[0]
area = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0]
area.type = 'SEQUENCE_EDITOR'
steps = [('proxy_render_size', 'NONE')]   # jakékoli přiřazení proxy_render_size (i 'SCENE') padá: memory access out of bounds
st = {'i': 0}
def tick():
    i = st['i']
    if i >= len(steps):
        out('OPS_DONE'); return None
    n, v = steps[i]; st['i'] += 1
    out('OPS seqcrash set', n, v)
    try: setattr(area.spaces.active, n, v)
    except BaseException as e: out('OPS seqcrash ERR', n, v, str(e)[:100])
    return 2.0
bpy.app.timers.register(tick, first_interval=3.0)
