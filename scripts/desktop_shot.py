# Desktop GUI screenshot for layout comparison (rule 3b): blender.exe --factory-startup --window-geometry 0 0 1400 850 --python desktop_shot.py -- C:\path\shot.png
import bpy, sys
out = sys.argv[sys.argv.index('--') + 1]
def shot():
    win = bpy.context.window_manager.windows[0]
    with bpy.context.temp_override(window=win, area=win.screen.areas[0]):
        bpy.ops.screen.screenshot(filepath=out)
    print('SHOT_DONE', out); sys.stdout.flush()
    bpy.ops.wm.quit_blender()
    return None
bpy.app.timers.register(shot, first_interval=4.0)
