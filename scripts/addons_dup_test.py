# H27: je seznam add-onů 2x? Spočítá moduly (addon_utils.modules) a duplicity, přepne velkou oblast na Preferences ▸ Add-ons.
import bpy, sys, addon_utils, collections
def out(*a):
    print(*a); sys.stdout.flush()
def tick():
    addon_utils.modules_refresh()
    mods = addon_utils.modules()
    names = [m.__name__ for m in mods]
    c = collections.Counter(names)
    out('OPS addons modules=%d unique=%d dups=%s' % (len(names), len(c), [n for n, k in c.items() if k > 1][:10]))
    out('OPS addons paths', addon_utils.paths())
    out('OPS addons enabled', sorted(bpy.context.preferences.addons.keys())[:20])
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            a.type = 'PREFERENCES'; break
    bpy.context.preferences.active_section = 'ADDONS'
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=6.0)
