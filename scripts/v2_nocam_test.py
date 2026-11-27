# V2: render animace bez kamery nesmí zaseknout stepper; potom musí jít normální video. Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
sc.camera = None
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 3
shutil.rmtree('/tmp/v2n', ignore_errors=True); os.makedirs('/tmp/v2n')
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2n/v'
st = {'s': 0, 'w': 0}
def tick():
    s = st['s']
    if s == 0:
        try:
            r = bpy.ops.render.render(animation=True)
            out('OPS v2n nocam_reports_error (desktop 5.3.0: RuntimeError "Cannot render, no camera")', 'FAIL', r)
        except Exception as e:
            out('OPS v2n nocam_reports_error (desktop 5.3.0: RuntimeError "Cannot render, no camera")', 'PASS' if 'no camera' in str(e) else 'FAIL', str(e).strip()[:80])
        st['s'] = 1; return 3.0
    if s == 1:
        bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
        bpy.ops.render.render(animation=True); st['s'] = 2; return 2.0
    if s == 2:
        g = [p for p in glob.glob('/tmp/v2n/v*.mp4') if os.path.getsize(p) > 100]
        if not g and st['w'] < 60:
            st['w'] += 1; return 1.0
        out('OPS v2n video_after_error', 'PASS' if g else 'FAIL')
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
