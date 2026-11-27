# V2: EEVEE render animace do MP4 (3 + 2 snímky). Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 3
shutil.rmtree('/tmp/v2a', ignore_errors=True); os.makedirs('/tmp/v2a')
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2a/vid'
sc.render.resolution_x = 64; sc.render.resolution_y = 48
combos = [(1, 3, 1, 3, dict()), (1, 2, 1, 2, dict(constant_rate_factor='HIGH'))]
fpss = [24, 24]
st = {'i': 0, 'w': 0, 'go': True}
def tick():
    i = st['i']
    if i >= len(combos):
        out('OPS_DONE'); return None
    a, b, step, n, opts = combos[i]
    pat = '/tmp/v2a/odd%d_*' % i
    if st['go']:
        sc.frame_start = a; sc.frame_end = b; sc.frame_step = step; sc.render.fps = fpss[i]; sc.render.fps_base = 1.001 if i == 2 else 1.0
        err = ''
        for k, v in opts.items():
            try: setattr(sc.render.ffmpeg, k, v)
            except Exception as e: err += ' %s:%s' % (k, str(e)[:40])
        if err: out('OPS v2q setattr', err)
        sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'
        sc.render.filepath = '/tmp/v2a/odd%d_' % i
        bpy.ops.render.render(animation=True); st['go'] = False; st['w'] = 0; return 2.0
    g = [p for p in glob.glob(pat) if os.path.getsize(p) > 100]
    if not g and st['w'] < 150:
        st['w'] += 1; return 1.0
    info = ''; ok = False
    if g:
        try:
            clip = bpy.data.movieclips.load(g[0]); ok = clip.frame_duration == n; info = 'size=%s' % (tuple(clip.size),)
        except Exception as e:
            info = str(e)
    out('OPS v2e', i, opts, 'expect', n, 'PASS' if ok else 'FAIL', info)
    st['i'] += 1; st['go'] = True; return 0.2
bpy.app.timers.register(tick, first_interval=1.0)
