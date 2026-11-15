# C1: Cycles (CPU) F12 — výchozí kostka, 64 samples 960×540, write_still. Běží přes ops_test.mjs (OPS_PY). Řádky: OPS cycles <krok> PASS/FAIL ...
# Stejný skript jde pustit v desktop Blenderu (CYC_DESKTOP=1 → render přes bpy.ops.render.render bez timerů) pro srovnání průměrů pixelů.
import bpy, os, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
out('OPS cycles build_option', 'PASS' if getattr(bpy.app.build_options, 'cycles', False) else 'FAIL', bpy.app.version_string)
try:
    import addon_utils
    out('OPS cycles addon_before', 'cycles' in bpy.context.preferences.addons, addon_utils.check('cycles'))
    m = addon_utils.enable('cycles', default_set=False, handle_error=lambda e: out('OPS cycles addon_error', repr(e)))
    out('OPS cycles addon_after', m, addon_utils.check('cycles'))
except Exception as e:
    out('OPS cycles addon_enable FAIL', e)
try:
    sc.render.engine = 'CYCLES'; eng_ok = sc.render.engine == 'CYCLES' and hasattr(bpy.types, 'CyclesRender')
except Exception as e:
    eng_ok = False; out('OPS cycles engine_error', e)
out('OPS cycles engine_enum', 'PASS' if eng_ok else 'FAIL')
sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = False
sc.render.resolution_x = 960; sc.render.resolution_y = 540; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = '/tmp/cyc.png'
if os.path.exists(sc.render.filepath): os.remove(sc.render.filepath)
state = {'step': 0, 'waited': 0, 't0': 0}
def stats(path):
    im = bpy.data.images.load(path, check_existing=False); px = list(im.pixels)
    n = len(px) // 4; mr = sum(px[0::4]) / n; mg = sum(px[1::4]) / n; mb = sum(px[2::4]) / n; a = max(px[3::4])
    return im.size[0], im.size[1], mr, mg, mb, a
def grid(path, gw=16, gh=9):
    im = bpy.data.images.load(path, check_existing=False); w, h = im.size; px = list(im.pixels); g = []
    for j in range(gh):
        for i in range(gw):
            x0, x1, y0, y1 = i * w // gw, (i + 1) * w // gw, j * h // gh, (j + 1) * h // gh; t = 0; n = 0
            for y in range(y0, y1, 6):
                for x in range(x0, x1, 6): k = (y * w + x) * 4; t += px[k] + px[k + 1] + px[k + 2]; n += 3
            g.append(round(t / n, 3))
    return g
def tick():
    s = state['step']
    if s == 0:
        state['t0'] = time.time(); out('OPS cycles render_start')
        try:
            bpy.ops.render.render(write_still=True)
        except Exception as e:
            out('OPS cycles render FAIL', e); out('OPS_DONE'); return None
        state['t1'] = time.time() - state['t0']; state['step'] = 1; return 1.0
    if s == 1:
        if not os.path.exists('/tmp/cyc.png') and state['waited'] < 30:
            state['waited'] += 1; return 1.0
        if not os.path.exists('/tmp/cyc.png'): out('OPS cycles write_still FAIL no file'); out('OPS_DONE'); return None
        w, h, r, g, b, a = stats('/tmp/cyc.png')
        ok = (w, h) == (960, 540) and a > 0.5 and (r + g + b) / 3 > 0.02
        out('OPS cycles engine_after', sc.render.engine, 'samples', sc.cycles.samples); out('OPS cycles write_still %s size=%dx%d mean=%.4f,%.4f,%.4f alpha=%.2f render_s=%.1f' % ('PASS' if ok else 'FAIL', w, h, r, g, b, a, state['t1']))
        out('OPS cycles grid', grid('/tmp/cyc.png'))
        out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=2.0)
