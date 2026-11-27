# V2: View Animation (Ctrl+F11) po renderu videa nesmí spadnout/zamrznout. Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 3
shutil.rmtree('/tmp/v2p', ignore_errors=True); os.makedirs('/tmp/v2p')
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2p/v'
st = {'s': 0, 'w': 0}
def tick():
    if st['s'] == 0:
        bpy.ops.render.render(animation=True); st['s'] = 1; return 2.0
    g = [p for p in glob.glob('/tmp/v2p/v*.mp4') if os.path.getsize(p) > 100]
    if not g and st['w'] < 60:
        st['w'] += 1; return 1.0
    out('OPS v2p video', 'PASS' if g else 'FAIL')
    try:
        r = bpy.ops.render.play_rendered_anim(); out('OPS v2p play_rendered_anim', 'PASS (nespadl)', r)
    except Exception as e:
        out('OPS v2p play_rendered_anim', 'PASS (chyba, nespadl)', str(e).strip()[:80])
    bpy.app.timers.register(after, first_interval=3.0)
    return None
def after():
    out('OPS v2p alive_after', 'PASS', len(bpy.data.objects)); out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
