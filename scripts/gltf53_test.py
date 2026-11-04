# 5.3: proč selže glTF export (import exporter modulu)?
import bpy, sys, traceback
def out(*a):
    print(*a); sys.stdout.flush()
def tick():
    try:
        bpy.ops.export_scene.gltf(filepath='/tmp/t.glb')
        out('OPS gltf PASS')
    except BaseException:
        for l in traceback.format_exc().splitlines()[-12:]: out('OPS gltf', l)
    try:
        import io_scene_gltf2.blender.exp as e
    except BaseException:
        for l in traceback.format_exc().splitlines()[-10:]: out('OPS gltfimp', l)
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=6.0)
