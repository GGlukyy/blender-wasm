# V2: výstupní cesty videa: neexistující složka, relativní //x (neuložený soubor). Běží přes ops_test.mjs (OPS_PY).
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
sc.render.resolution_x = 64; sc.render.resolution_y = 48
combos = [('/tmp/v2a/newdir/sub/vid_', '/tmp/v2a/newdir/sub/vid_*'), ('//relvid_', None)]
st = {'i': 0, 'w': 0, 'go': True}
def tick():
    i = st['i']
    if i >= len(combos):
        out('OPS_DONE'); return None
    fp, pat = combos[i]
    if st['go']:
        sc.frame_start = 1; sc.frame_end = 3; sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'
        sc.render.filepath = fp
        bpy.ops.render.render(animation=True); st['go'] = False; st['w'] = 0; return 2.0
    pats = [pat] if pat else [os.path.join(os.getcwd(), 'relvid_*'), '/relvid_*', '/tmp/relvid_*', '/opfs/home/relvid_*']
    g = [p for q in pats for p in glob.glob(q) if os.path.getsize(p) > 100]
    if not g and st['w'] < 150:
        st['w'] += 1; return 1.0
    info = ''; ok = False
    if g:
        try:
            clip = bpy.data.movieclips.load(g[0]); ok = clip.frame_duration == 3; info = 'size=%s' % (tuple(clip.size),)
        except Exception as e:
            info = str(e)
    out('OPS v2a path', fp, 'cwd=' + os.getcwd(), g[:1], 'PASS' if ok else 'FAIL', info)
    st['i'] += 1; st['go'] = True; return 0.2
bpy.app.timers.register(tick, first_interval=1.0)
