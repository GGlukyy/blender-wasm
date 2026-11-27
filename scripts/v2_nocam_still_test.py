# V2c: F12 jeden snímek bez kamery - chyba jako v desktopu? Běží přes ops_test.mjs (OPS_PY).
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
sc.camera = None; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48
def tick():
    try:
        r = bpy.ops.render.render(); out('OPS v2s still_nocam', 'FAIL', r)
    except Exception as e:
        out('OPS v2s still_nocam', 'PASS' if 'no camera' in str(e) else 'FAIL', str(e).strip()[:80])
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
