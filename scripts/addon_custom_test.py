# A: vlastní add-on (.zip i .py) → Install from Disk → enable → operátor funguje; cesta je v persistentním HOME (/opfs/home).
import bpy, sys, os, zipfile, addon_utils, traceback
def out(*a):
    print(*a); sys.stdout.flush()
SRC = '''bl_info = {"name": "Lukas Test Addon %s", "blender": (4, 2, 0), "category": "Object"}
import bpy
class OBJECT_OT_lt_%s(bpy.types.Operator):
    bl_idname = "object.lt_%s"
    bl_label = "LT %s"
    def execute(self, ctx):
        bpy.ops.mesh.primitive_cube_add(size=3)
        return {"FINISHED"}
def register(): bpy.utils.register_class(OBJECT_OT_lt_%s)
def unregister(): bpy.utils.unregister_class(OBJECT_OT_lt_%s)
'''
def mk(n):
    return SRC % ((n,) * 6)
def tick():
    ok = True
    try:
        adir = bpy.utils.user_resource('SCRIPTS', path='addons', create=True)
        out('OPS info user addons dir', adir)
        if not adir.startswith('/opfs/home'):
            out('OPS FAIL addons dir not persistent'); ok = False
        os.makedirs('/tmp/at', exist_ok=True)
        # .py
        with open('/tmp/at/ltpy.py', 'w') as f: f.write(mk('py'))
        # .zip (balíček s __init__.py)
        with zipfile.ZipFile('/tmp/at/ltzip.zip', 'w') as z: z.writestr('ltzip/__init__.py', mk('zip'))
        for mod, path in (('ltpy', '/tmp/at/ltpy.py'), ('ltzip', '/tmp/at/ltzip.zip')):
            r = bpy.ops.preferences.addon_install(filepath=path, overwrite=True)
            out('OPS install', mod, r)
            addon_utils.modules_refresh()
            r2 = bpy.ops.preferences.addon_enable(module=mod)
            n0 = len(bpy.data.objects)
            r3 = getattr(bpy.ops.object, 'lt_' + mod[2:])()
            good = ('FINISHED' in r3) and len(bpy.data.objects) == n0 + 1 and os.path.exists(os.path.join(adir, mod + ('.py' if mod == 'ltpy' else '')))
            out('OPS addon', mod, 'PASS' if good else 'FAIL', r2, r3, os.listdir(adir)[:6])
            ok = ok and good
    except BaseException as e:
        ok = False; out('OPS EXC', type(e).__name__, str(e).replace('\n', ' ')[:200], traceback.format_exc().replace('\n', ' | ')[-300:])
    out('OPS_DONE failed=%d total=2' % (0 if ok else 1))
    return None
bpy.app.timers.register(tick, first_interval=6.0)
