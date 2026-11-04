# 5.3: FBX export + image formats: kde to padá
import bpy, sys, traceback, os
def out(*a):
    print(*a); sys.stdout.flush()
def tick():
    for name, fn in (('fbx', lambda: bpy.ops.export_scene.fbx(filepath='/tmp/t.fbx')), ('glb', lambda: bpy.ops.export_scene.gltf(filepath='/tmp/t.glb'))):
        try:
            fn(); out('OPS', name, 'PASS', os.path.exists('/tmp/t.' + name[:3]))
        except BaseException:
            for l in traceback.format_exc().splitlines()[-8:]: out('OPS', name, l)
    img = bpy.data.images.new('x', 8, 8)
    for fmt, ext in (('JPEG', 'jpg'), ('OPEN_EXR', 'exr'), ('TARGA', 'tga'), ('BMP', 'bmp'), ('HDR', 'hdr'), ('PNG', 'png')):
        try:
            img.file_format = fmt; img.filepath_raw = '/tmp/x.' + ext; img.save(); out('OPS img', fmt, 'PASS', os.path.getsize('/tmp/x.' + ext))
        except BaseException as e:
            out('OPS img', fmt, 'FAIL', repr(e)[:160])
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=6.0)
