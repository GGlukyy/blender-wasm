# V2: které kontejnery/kodeky z nabídky Blenderu se opravdu zapíšou (2 snímky 64x48). Jen PC build (FFmpeg). Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, glob, shutil
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.frame_start, sc.frame_end = 1, 2
sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'
rna = bpy.types.FFmpegSettings.bl_rna.properties
fmts = [e.identifier for e in rna['format'].enum_items]
cods = [e.identifier for e in rna['codec'].enum_items]
out('OPS v2c formats', ' '.join(fmts)); out('OPS v2c codecs', ' '.join(cods))
# (kontejner, kodek) - nejběžnější volby z nabídky
combos = [(f, c) for f, c in [('MPEG4', 'H264'), ('MPEG4', 'MPEG4'), ('AVI', 'H264'), ('AVI', 'MPEG4'), ('AVI', 'PNG'), ('QUICKTIME', 'H264'), ('QUICKTIME', 'PNG'),
          ('MKV', 'H264'), ('MKV', 'MPEG4'), ('WEBM', 'WEBM'), ('WEBM', 'AV1'), ('MPEG4', 'AV1'), ('MKV', 'AV1'), ('OGG', 'THEORA'), ('FLASH', 'FLASH'), ('DV', 'DNXHD'), ('MPEG2', 'MPEG2'), ('MPEG1', 'MPEG1'), ('QUICKTIME', 'PRORES'), ('MKV', 'HUFFYUV'), ('MKV', 'FFV1')] if f in fmts and c in cods]
shutil.rmtree('/tmp/v2c', ignore_errors=True); os.makedirs('/tmp/v2c')
st = {'i': 0, 'w': 0}
def tick():
    i = st['i']
    if i >= len(combos):
        out('OPS_DONE'); return None
    f, c = combos[i]
    if st['w'] == 0:
        try:
            sc.render.ffmpeg.format = f; sc.render.ffmpeg.codec = c
        except Exception as e:
            out('OPS v2c', f, c, 'SKIP set', e); st['i'] += 1; return 0.1
        sc.render.filepath = '/tmp/v2c/%s_%s_' % (f, c)
        try:
            bpy.ops.render.render(animation=True)
        except Exception as e:
            out('OPS v2c', f, c, 'FAIL render', e); st['i'] += 1; return 0.1
        st['w'] = 1; return 1.0
    g = [p for p in glob.glob('/tmp/v2c/%s_%s_*' % (f, c)) if os.path.isfile(p)]
    sz = os.path.getsize(g[0]) if g else 0
    if sz < 300 and st['w'] < 30:
        st['w'] += 1; return 1.0
    ok = False; info = ''
    if sz >= 300:
        try:
            clip = bpy.data.movieclips.load(g[0]); ok = clip.frame_duration == 2 and tuple(clip.size) == (64, 48); info = 'frames=%d' % clip.frame_duration
        except Exception as e:
            info = 'load: %s' % e
    out('OPS v2c', f, c, 'PASS' if ok else 'FAIL', 'size=%d' % sz, info)
    st['i'] += 1; st['w'] = 0; return 0.2
bpy.app.timers.register(tick, first_interval=1.0)
