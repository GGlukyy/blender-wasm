# Operátory okna a „globální“ akce, které by mohly na webu shodit runtime. OPS_PY=winops_test.py
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
CASES = [
 ('window_new', lambda: bpy.ops.wm.window_new()),
 ('window_close_new', lambda: [bpy.ops.wm.window_close() for w in bpy.context.window_manager.windows[1:]]),
 ('window_fullscreen_toggle', lambda: bpy.ops.wm.window_fullscreen_toggle()),
 ('window_fullscreen_toggle_back', lambda: bpy.ops.wm.window_fullscreen_toggle()),
 ('area_dupli', lambda: bpy.ops.screen.area_dupli('INVOKE_DEFAULT')),
 ('screen_full_area', lambda: bpy.ops.screen.screen_full_area()),
 ('screen_full_area_back', lambda: bpy.ops.screen.screen_full_area()),
 ('read_factory_settings', lambda: bpy.ops.wm.read_factory_settings()),
 ('read_homefile', lambda: bpy.ops.wm.read_homefile()),
 ('recover_last_session', lambda: bpy.ops.wm.recover_last_session()),
 ('splash', lambda: bpy.ops.wm.splash()),
 ('call_menu_search', lambda: bpy.ops.wm.search_menu('INVOKE_DEFAULT')),
 ('save_mainfile_tmp', lambda: bpy.ops.wm.save_as_mainfile(filepath='/tmp/winops.blend')),
 ('open_mainfile_tmp', lambda: bpy.ops.wm.open_mainfile(filepath='/tmp/winops.blend')),
 ('revert_mainfile', lambda: bpy.ops.wm.revert_mainfile()),
 ('console_toggle', lambda: bpy.ops.wm.console_toggle()),
 ('debug_menu', lambda: bpy.ops.wm.debug_menu()),
 ('redraw_timer', lambda: bpy.ops.wm.redraw_timer(type='DRAW', iterations=2)),
]
st = {'i': -1, 'bad': 0}
def tick():
    if st['i'] >= 0:
        pass
    st['i'] += 1
    if st['i'] >= len(CASES):
        out('OPS_DONE failed=%d total=%d' % (st['bad'], len(CASES))); return None
    n, fn = CASES[st['i']]
    try:
        r = fn()
        out('OPS winop', n, 'PASS', repr(r)[:60])
    except BaseException as e:
        out('OPS winop', n, 'ERR(ok-if-expected)', type(e).__name__, str(e).replace('\n', ' ')[:100])
    return 3.0
bpy.app.timers.register(tick, first_interval=6.0, persistent=True)
