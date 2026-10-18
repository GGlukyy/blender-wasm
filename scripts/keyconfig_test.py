# Repro: bpy.utils.keyconfig_init() za běhu (volá se při změně Emulate 3 Button Mouse v Preferences) → pád „function signature mismatch“?
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
steps = ['init']
st = {'i': 0}
def tick():
    i = st['i']
    if i >= 1:
        out('OPS_DONE'); return None
    st['i'] += 1
    out('OPS keyconfig try init')
    try:
        bpy.utils.keyconfig_init(); out('OPS keyconfig ok')
    except BaseException as e: out('OPS keyconfig ERR', type(e).__name__, str(e)[:100])
    return 3.0
bpy.app.timers.register(tick, first_interval=3.0)
