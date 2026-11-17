# Desktop 5.3.0 GUI: Cycles Rendered, bez overlayů, světový barvy dle env WORLD (r,g,b) -> screenshot. Pro srovnání s webem (cycles_bg_test.py).
import bpy, sys, os, time
out = sys.argv[sys.argv.index('--') + 1]
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.preview_samples = 16; sc.cycles.use_preview_denoising = False
col = os.environ.get('WORLD')
if col:
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = tuple(float(x) for x in col.split(',')) + (1,)
if os.environ.get('VT'): sc.view_settings.view_transform = os.environ['VT']
win = bpy.context.window_manager.windows[0]
v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
v3d.shading.type = 'RENDERED'; v3d.overlay.show_overlays = False
t0 = time.time()
def shot():
    if time.time() - t0 < 12: return 1.0
    with bpy.context.temp_override(window=win, area=win.screen.areas[0]):
        bpy.ops.screen.screenshot(filepath=out)
    print('SHOT_DONE'); sys.stdout.flush(); bpy.ops.wm.quit_blender(); return None
bpy.app.timers.register(shot, first_interval=3.0)
