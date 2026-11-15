# C1: Rendered náhled s Cycles ve 3D pohledu 10 s bez chyby. Běží přes ops_test.mjs (OPS_PY).
import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
import addon_utils
addon_utils.enable('cycles', default_set=False)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.preview_samples = 16; sc.cycles.use_preview_denoising = False
win = bpy.context.window_manager.windows[0]
v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
v3d.shading.type = 'RENDERED'
state = {'t0': time.time(), 'n': 0}
def tick():
    state['n'] += 1
    if time.time() - state['t0'] < 12:
        return 0.5
    out('OPS cycles rendered_10s PASS ticks=%d engine=%s shading=%s' % (state['n'], sc.render.engine, v3d.shading.type))
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
