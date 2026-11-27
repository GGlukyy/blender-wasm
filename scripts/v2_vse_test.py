# V2: render videa ze sekvenceru (barevný pás, bez kamery, use_sequencer) -> MP4. Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
sc.camera = None
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 4
sc.sequence_editor_create()
c = sc.sequence_editor.strips.new_effect('col', 'COLOR', 1, frame_start=1, length=4); c.color = (1, 0, 0)
sc.render.use_sequencer = True
shutil.rmtree('/tmp/v2v', ignore_errors=True); os.makedirs('/tmp/v2v')
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2v/v'
st = {'s': 0, 'w': 0}
def tick():
    if st['s'] == 0:
        try:
            r = bpy.ops.render.render(animation=True); out('OPS v2v render_result', r)
        except Exception as e:
            out('OPS v2v render_raised', str(e).strip()[:80])
        st['s'] = 1; return 2.0
    g = [p for p in glob.glob('/tmp/v2v/v*.mp4') if os.path.getsize(p) > 100]
    if not g and st['w'] < 60:
        st['w'] += 1; return 1.0
    ok = False; info = ''
    if g:
        try:
            clip = bpy.data.movieclips.load(g[0]); ok = clip.frame_duration == 4; info = 'frames=%d' % clip.frame_duration
        except Exception as e:
            info = str(e)
    out('OPS v2v vse_video', 'PASS' if ok else 'FAIL', info)
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
