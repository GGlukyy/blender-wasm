# V2: render animace do MP4 (H.264) + načtení videa zpět (movie clip i VSE strip). Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
cube = bpy.context.object
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = 128; sc.render.resolution_y = 72; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 24
cube.location.x = 0; cube.keyframe_insert('location', frame=1); cube.location.x = 1; cube.keyframe_insert('location', frame=24)
fmts = [e.identifier for e in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items]
out('OPS v2 formats_has_FFMPEG', 'PASS' if 'FFMPEG' in fmts else 'FAIL')
P = '/tmp/v2/out.mp4'
os.makedirs('/tmp/v2', exist_ok=True)
if os.path.exists(P): os.remove(P)
try:
    sc.render.image_settings.file_format = 'FFMPEG'
    sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'
except Exception as e:
    out('OPS v2 set_ffmpeg FAIL', e)
sc.render.filepath = '/tmp/v2/out'
state = {'step': 0, 'waited': 0}
def tick():
    s = state['step']
    if s == 0:
        bpy.ops.render.render(animation=True); state['step'] = 1; return 2.0
    if s == 1:
        sz = os.path.getsize(P) if os.path.exists(P) else 0
        if sz < 1000 and state['waited'] < 90:
            state['waited'] += 1; return 1.0
        head = open(P, 'rb').read(12) if sz else b''
        out('OPS v2 mp4_written', 'PASS' if sz > 1000 and head[4:8] == b'ftyp' else 'FAIL', 'size=%d' % sz)
        state['step'] = 2; return 0.5
    if s == 2:
        try:
            clip = bpy.data.movieclips.load(P)
            out('OPS v2 movieclip', 'PASS' if clip.frame_duration == 24 and clip.size[0] == 128 else 'FAIL', 'frames=%d size=%s' % (clip.frame_duration, tuple(clip.size)))
        except Exception as e:
            out('OPS v2 movieclip FAIL', e)
        try:
            sc.sequence_editor_create()
            st = sc.sequence_editor.strips.new_movie('m', P, 1, 1)
            out('OPS v2 vse_strip', 'PASS' if st.frame_final_duration == 24 else 'FAIL', 'dur=%d' % st.frame_final_duration)
        except Exception as e:
            out('OPS v2 vse_strip FAIL', e)
        state['step'] = 3; return 0.5
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
