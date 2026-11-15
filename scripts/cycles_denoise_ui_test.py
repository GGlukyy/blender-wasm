# C1b-2: bez OIDN musí UI Cycles ukázat denoise jako neaktivní (show_denoise_active False)
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
try:
    import addon_utils
    addon_utils.enable('cycles', default_set=False)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.use_denoising = True
    import _cycles, cycles.ui as u
    out('OPS cycles oidn_flag', _cycles.with_openimagedenoise)
    r = u.show_denoise_active(bpy.context)
    out('OPS cycles denoise_ui_inactive', 'PASS' if (r is False and not _cycles.with_openimagedenoise) else 'FAIL', r)
except Exception as e:
    import traceback
    out('OPS cycles denoise_ui_inactive FAIL', repr(e), traceback.format_exc().replace('\n', ' | '))
out('OPS_DONE')
