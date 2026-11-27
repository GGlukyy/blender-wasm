# V2: render animace do MP4 (H.264) + načtení videa zpět (movie clip i VSE strip). Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, time
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
cube = bpy.context.object
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = 1920; sc.render.resolution_y = 1080; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 12
cube.location.x = 0; cube.keyframe_insert('location', frame=1); cube.location.x = 1; cube.keyframe_insert('location', frame=12)
fmts = [e.identifier for e in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items]
out('OPS v2 formats_has_FFMPEG', 'PASS' if 'FFMPEG' in fmts else 'FAIL')
P = ''  # Blender připíše rozsah snímků: out0001-0024.mp4
os.makedirs('/tmp/v2', exist_ok=True)
for f in glob.glob('/tmp/v2/*.mp4'): os.remove(f)
try:
    sc.render.image_settings.media_type = 'VIDEO'
    sc.render.image_settings.file_format = 'FFMPEG'
    sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'
except Exception as e:
    out('OPS v2 set_ffmpeg FAIL', e)
sc.render.filepath = '/tmp/v2/out'
state = {'step': 0, 'waited': 0, 't0': 0}
def tick():
    global P
    s = state['step']
    if s == 0:
        state['t0'] = time.time(); bpy.ops.render.render(animation=True); state['step'] = 1; return 2.0
    if s == 1:
        g = glob.glob('/tmp/v2/*.mp4'); P = g[0] if g else ''
        sz = os.path.getsize(P) if P else 0
        if sz < 1000 and state['waited'] < 400:
            state['waited'] += 1; return 1.0
        out('OPS v2hd mp4', 'PASS' if sz > 1000 else 'FAIL', 'size=%d sec=%.1f' % (sz, time.time() - state['t0']))
        try:
            clip = bpy.data.movieclips.load(P); out('OPS v2hd clip', 'PASS' if clip.frame_duration == 12 and tuple(clip.size) == (1920, 1080) else 'FAIL', clip.frame_duration, tuple(clip.size))
        except Exception as e: out('OPS v2hd clip FAIL', e)
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
