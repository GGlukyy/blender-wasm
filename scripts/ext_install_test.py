# H24/T4: Extensions ▸ Install from Disk (extensions.package_install_files) bez podprocesu: extension .zip + legacy .zip/.py
import bpy, sys, os, zipfile, addon_utils
def out(*a):
    print(*a); sys.stdout.flush()
MANIFEST = '''schema_version = "1.0.0"
id = "lt_ext"
version = "1.0.0"
name = "LT Ext"
tagline = "Test extension"
maintainer = "Lukas <l@example.com>"
type = "add-on"
blender_version_min = "4.2.0"
license = ["SPDX:GPL-3.0-or-later"]
'''
INIT = '''import bpy
class OBJECT_OT_lt_ext(bpy.types.Operator):
    bl_idname = "object.lt_ext"
    bl_label = "LT ext"
    def execute(self, ctx):
        bpy.ops.mesh.primitive_cube_add(size=3)
        return {"FINISHED"}
def register(): bpy.utils.register_class(OBJECT_OT_lt_ext)
def unregister(): bpy.utils.unregister_class(OBJECT_OT_lt_ext)
'''
def tick():
    ok = True
    try:
        os.makedirs('/tmp/at', exist_ok=True)
        with zipfile.ZipFile('/tmp/at/lt_ext.zip', 'w') as z:
            z.writestr('blender_manifest.toml', MANIFEST); z.writestr('__init__.py', INIT)
        out('OPS info repos', [(r.module, r.directory) for r in bpy.context.preferences.extensions.repos])
        r = bpy.ops.extensions.package_install_files(filepath='/tmp/at/lt_ext.zip', repo='user_default', enable_on_install=True, overwrite=True)
        out('OPS info install result', r)
        bpy.app.timers.register(lambda: check(), first_interval=3.0)
    except Exception as e:
        import traceback; out('OPS FAIL', repr(e), traceback.format_exc()[-600:]); out('OPS_DONE')
def check():
    try: bpy.ops.object.lt_ext.get_rna_type(); ok = True
    except Exception as e: ok = False; out('OPS info rna', repr(e)[:120])
    ok = ok and any('lt_ext' in m for m in sys.modules)
    out('OPS info mods', [m for m in sys.modules if 'lt_ext' in m or m.startswith('bl_ext')][:8])
    out('OPS info walk', [os.path.join(dp, f) for dp, dn, fn in os.walk('/opfs/home/.config/blender') for f in fn + dn if 'lt_ext' in dp or 'lt_ext' in f][:8])
    out('OPS PASS' if ok else 'OPS FAIL', 'operator object.lt_ext registered after extension install:', ok)
    try:
        d = [(r.module, r.directory, os.path.isdir(r.directory) and os.listdir(r.directory)) for r in bpy.context.preferences.extensions.repos]
        out('OPS info enabled', [m for m in bpy.context.preferences.addons.keys() if 'lt_ext' in m])
        out('OPS info dirs', d)
    except Exception as e: out('OPS info', e)
    out('OPS_DONE')
    return None
bpy.app.timers.register(lambda: (tick(), None)[1], first_interval=8.0)
