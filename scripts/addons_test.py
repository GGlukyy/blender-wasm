# Zapne každý přibalený add-on (addons_core + addons) a hlásí chyby. OPS_PY=addons_test.py
import bpy, sys, addon_utils, traceback
def out(*a):
    print(*a); sys.stdout.flush()
mods = sorted(m.__name__ for m in addon_utils.modules(refresh=True))
out('OPS info addons', len(mods), ','.join(mods)[:300])
st = {'i': 0, 'bad': 0}
def tick():
    if st['i'] >= len(mods):
        out('OPS_DONE failed=%d total=%d' % (st['bad'], len(mods))); return None
    n = mods[st['i']]; st['i'] += 1
    out('OPS enabling', n)
    try:
        m = addon_utils.enable(n, default_set=True, persistent=False, handle_error=lambda e: (_ for _ in ()).throw(e))
        ok = m is not None
        out('OPS addon', n, 'PASS' if ok else 'FAIL none')
        if not ok: st['bad'] += 1
        else: addon_utils.disable(n, default_set=True)
    except BaseException as e:
        msg = str(e).replace('\n', ' ')[:160]
        # známé, zdokumentované (BACKLOG): ui_translate chce `_ctypes`; add-on cycles chce `_cycles` (v iPad/lean buildu není)
        if (n, type(e).__name__, msg) in (('ui_translate', 'ModuleNotFoundError', "No module named '_ctypes'"), ('cycles', 'ModuleNotFoundError', "No module named '_cycles'")):
            out('OPS addon', n, 'XFAIL', type(e).__name__, msg)
        else:
            st['bad'] += 1; out('OPS addon', n, 'FAIL', type(e).__name__, msg)
    return 0.5
bpy.app.timers.register(tick, first_interval=6.0)
