# V2: po renderu videa (MP4) přepnout zpět na PNG a udělat F12 jeden snímek + animaci do PNG. Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 3
shutil.rmtree('/tmp/v2a', ignore_errors=True); os.makedirs('/tmp/v2a')
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2a/vid'
st = {'s': 0, 'w': 0}
def files(pat): return [p for p in glob.glob(pat) if os.path.getsize(p) > 100]
def tick():
    s = st['s']
    if s == 0:
        bpy.ops.render.render(animation=True); st['s'] = 1; return 2.0
    if s == 1:
        if not files('/tmp/v2a/vid*.mp4') and st['w'] < 60:
            st['w'] += 1; return 1.0
        out('OPS v2a video', 'PASS' if files('/tmp/v2a/vid*.mp4') else 'FAIL')
        sc.render.image_settings.media_type = 'IMAGE'; sc.render.image_settings.file_format = 'PNG'
        sc.render.filepath = '/tmp/v2a/still'
        bpy.ops.render.render(write_still=True); st['s'] = 2; st['w'] = 0; return 2.0
    if s == 2:
        if not files('/tmp/v2a/still.png') and st['w'] < 60:
            st['w'] += 1; return 1.0
        ok = bool(files('/tmp/v2a/still.png'))
        if ok:
            im = bpy.data.images.load('/tmp/v2a/still.png'); ok = tuple(im.size) == (64, 48) and sum(im.pixels[:]) > 1
        out('OPS v2a still_png', 'PASS' if ok else 'FAIL')
        sc.render.filepath = '/tmp/v2a/anim_'
        bpy.ops.render.render(animation=True); st['s'] = 3; st['w'] = 0; return 2.0
    if s == 3:
        if len(files('/tmp/v2a/anim_*.png')) < 3 and st['w'] < 60:
            st['w'] += 1; return 1.0
        out('OPS v2a anim_png', 'PASS' if len(files('/tmp/v2a/anim_*.png')) == 3 else 'FAIL', 'n=%d' % len(files('/tmp/v2a/anim_*.png')))
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
