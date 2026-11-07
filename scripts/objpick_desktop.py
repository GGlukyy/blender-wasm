# Desktop GUI: blender.exe --factory-startup --window-geometry 0 0 1400 850 --python objpick_desktop.py; po PICK_DONE se ukončí.
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
sys.path.insert(0, os.getcwd())
import objpick_common as c
_p = c.pick
def pick_and_quit():
    _p(); bpy.ops.wm.quit_blender()
c.pick = pick_and_quit
bpy.app.timers.register(lambda: (c.main(), None)[1], first_interval=4.0)
