# V2: PNG sekvence s use_overwrite=False + use_placeholder: druhý render nesmí smazat ani poškodit snímky (slabý test: shodná velikost, nedokazuje, že se nepřepsalo). Běží přes ops_test.mjs (OPS_PY).
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
sc.render.image_settings.file_format = 'PNG'; sc.render.use_overwrite = False; sc.render.use_placeholder = True
sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'; sc.render.filepath = '/tmp/v2a/vid'
sc.render.resolution_x = 64; sc.render.resolution_y = 48
combos = [(1, 3, 1, 3, dict()), (1, 3, 1, 3, dict())]
fpss = [24, 24]
st = {'i': 0, 'w': 0, 'go': True}
def tick():
    i = st['i']
    if i >= len(combos):
        out('OPS_DONE'); return None
    a, b, step, n, opts = combos[i]
    pat = '/tmp/v2a/same_*.png'
    if st['go']:
        sc.frame_start = a; sc.frame_end = b; sc.frame_step = step; sc.render.fps = fpss[i]; sc.render.fps_base = 1.001 if i == 2 else 1.0
        err = ''
        for k, v in opts.items():
            try: setattr(sc.render.ffmpeg, k, v)
            except Exception as e: err += ' %s:%s' % (k, str(e)[:40])
        if err: out('OPS v2q setattr', err)
        sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'
        sc.render.filepath = '/tmp/v2a/same_'
        bpy.ops.render.render(animation=True); st['go'] = False; st['w'] = 0; return 2.0
    g = [p for p in glob.glob(pat) if os.path.getsize(p) > 100]
    if i == 1 and len(g) < 3: g = []
    if i == 0 and len(g) < 3: g = []
    if not g and st['w'] < 150:
        st['w'] += 1; return 1.0
    sizes = sorted((os.path.basename(p), os.path.getsize(p)) for p in glob.glob(pat)); ok = len(sizes) == 3
    if i == 1: ok = ok and sizes == st.get('prev')
    st['prev'] = sizes
    out('OPS v2o', i, sizes, 'PASS' if ok else 'FAIL')
    st['i'] += 1; st['go'] = True; return 0.2
bpy.app.timers.register(tick, first_interval=1.0)
