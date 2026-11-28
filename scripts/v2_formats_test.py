# F12 write_still do různých formátů obrázku, po jednom (27. 11. se společný test zasekl). Běží přes ops_test.mjs (OPS_PY).
# Před každým formátem vypíše 'OPS v2f start <fmt>' → když něco visí, poslední start řekne co.
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
shutil.rmtree('/tmp/v2f', ignore_errors=True); os.makedirs('/tmp/v2f')
F = os.environ.get('V2F_ONLY', '') or 'JPEG,BMP,TIFF,OPEN_EXR,OPEN_EXR_MULTILAYER,WEBP,HDR,TARGA,TARGA_RAW,PNG,JPEG2000,CINEON,IRIS,DPX'  # jen jeden: Q='env=V2F_ONLY=DPX'
fmts = [f for f in F.split(',') if f]
out('OPS v2f enum', [i.identifier for i in sc.render.image_settings.bl_rna.properties['file_format'].enum_items])
st = {'i': 0, 'go': True, 'w': 0}
def tick():
    i = st['i']
    if i >= len(fmts):
        out('OPS_DONE'); return None
    f = fmts[i]
    if st['go']:
        try:
            # 5.3: vícevrstvý EXR je vlastní media_type
            sc.render.image_settings.media_type = 'MULTI_LAYER_IMAGE' if f == 'OPEN_EXR_MULTILAYER' else 'IMAGE'
            sc.render.image_settings.file_format = f
        except Exception as e:
            # desktop 5.3.0 má WEBP i JPEG2000; web je nemá (OIIO bez WebP, WITH_IMAGE_OPENJPEG=OFF) → BACKLOG V2f
            out('OPS v2f', f, 'ZNÁMÉ OMEZENÍ (není ve web buildu, desktop ano)' if f in ('WEBP', 'JPEG2000') else 'FAIL', str(e)[:60]); st['i'] += 1; return 0.2
        out('OPS v2f start', f)
        sc.render.filepath = '/tmp/v2f/f%d_' % i
        bpy.ops.render.render(write_still=True); st['go'] = False; st['w'] = 0; return 1.0
    g = [p for p in glob.glob('/tmp/v2f/f%d_*' % i) if os.path.getsize(p) > 50]
    if not g and st['w'] < 30:
        st['w'] += 1; return 1.0
    ok = False; info = str([(os.path.basename(p), os.path.getsize(p)) for p in g])
    if g:
        try:
            im = bpy.data.images.load(g[0]); px = list(im.pixels); w, h = im.size
            c = [px[((h // 2) * w + w // 2) * 4 + k] for k in range(3)] if px else []
            ok = (w, h) == (64, 48); info += ' size=%s center=%s' % ((w, h), [round(x, 3) for x in c])
            if f == 'OPEN_EXR_MULTILAYER':  # desktop 5.3.0 taky: načtený multilayer má size (0,0), typ MULTILAYER
                ok = im.type == 'MULTILAYER'; info += ' type=' + im.type
        except Exception as e:
            info += ' load ERR ' + str(e)[:60]
    out('OPS v2f', f, 'PASS' if ok else 'FAIL', info)
    st['i'] += 1; st['go'] = True; return 0.2
bpy.app.timers.register(tick, first_interval=1.0)
