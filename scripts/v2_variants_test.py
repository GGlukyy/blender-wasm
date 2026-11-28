# V2f-b: varianty formátů (EXR kodeky, 16bit PNG/TIFF, BW, RGBA, JPEG kvalita) F12 → soubor → načíst; střed + alfa rohu.
# Stejný skript běží i na desktopu (blender.exe -b, DESK=1 → render synchronně). Výstup 'OPS v2v <id> <size> <center> <corner_a>'.
import bpy, os, sys, glob, shutil
def out(*a): print(*a); sys.stdout.flush()
DESK = os.environ.get('DESK') == '1'
D = 'C:/Users/lukil/p2win/out/v2v' if DESK else '/tmp/v2v'
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
sc.render.film_transparent = True
shutil.rmtree(D, ignore_errors=True); os.makedirs(D)
V = [('exr_' + c.lower(), 'OPEN_EXR', dict(exr_codec=c, color_depth='16' if c in ('B44', 'B44A') else '32', color_mode='RGBA'))
     for c in ('NONE', 'PXR24', 'ZIP', 'PIZ', 'RLE', 'ZIPS', 'B44', 'B44A', 'DWAA', 'DWAB')]
V += [('exr_half', 'OPEN_EXR', dict(color_depth='16', exr_codec='ZIP')),
      ('png16', 'PNG', dict(color_depth='16', color_mode='RGBA')), ('png_bw', 'PNG', dict(color_mode='BW')),
      ('png_c0', 'PNG', dict(compression=0, color_mode='RGB')), ('tif16', 'TIFF', dict(color_depth='16', color_mode='RGBA')),
      ('tif_none', 'TIFF', dict(tiff_codec='NONE')), ('tif_lzw', 'TIFF', dict(tiff_codec='LZW')), ('tif_pack', 'TIFF', dict(tiff_codec='PACKBITS')),
      ('jpg_q10', 'JPEG', dict(quality=10)), ('jpg_bw', 'JPEG', dict(color_mode='BW')), ('webp_rgba', 'WEBP', dict(color_mode='RGBA', quality=100)),
      ('bmp_bw', 'BMP', dict(color_mode='BW')), ('tga_rgba', 'TARGA', dict(color_mode='RGBA')), ('dpx_rgba', 'DPX', dict(color_mode='RGBA'))]
st = {'i': 0, 'go': True, 'w': 0}
def report(i, vid):
    g = [p for p in glob.glob('%s/%s*' % (D, vid)) if os.path.getsize(p) > 50]
    if not g: out('OPS v2v', vid, 'NOFILE'); return
    try:
        im = bpy.data.images.load(g[0]); px = list(im.pixels); w, h = im.size; ch = im.channels
        c = [round(px[((h // 2) * w + w // 2) * 4 + k], 2) for k in range(4)]
        out('OPS v2v', vid, '%dx%d' % (w, h), c, 'corner_a=%.2f' % px[3])
    except Exception as e: out('OPS v2v', vid, 'LOADERR', str(e)[:60])
def setup(vid, fmt, opts):
    s = sc.render.image_settings; s.media_type = 'IMAGE'; s.file_format = fmt
    for k, v in opts.items():
        try: setattr(s, k, v)
        except Exception as e: out('OPS v2v', vid, 'SETERR', k, str(e)[:40])
    sc.render.filepath = '%s/%s_' % (D, vid)
if DESK:
    for vid, fmt, opts in V:
        try: setup(vid, fmt, opts); bpy.ops.render.render(write_still=True)
        except Exception as e: out('OPS v2v', vid, 'ERR', str(e)[:60]); continue
        report(0, vid)
    out('OPS_DONE')
else:
    def tick():
        i = st['i']
        if i >= len(V): out('OPS_DONE'); return None
        vid, fmt, opts = V[i]
        if st['go']:
            try: setup(vid, fmt, opts)
            except Exception as e: out('OPS v2v', vid, 'ERR', str(e)[:60]); st['i'] += 1; return 0.2
            out('OPS v2v start', vid); bpy.ops.render.render(write_still=True); st['go'] = False; st['w'] = 0; return 1.0
        if not [p for p in glob.glob('%s/%s*' % (D, vid)) if os.path.getsize(p) > 50] and st['w'] < 20:
            st['w'] += 1; return 1.0
        report(i, vid); st['i'] += 1; st['go'] = True; return 0.2
    bpy.app.timers.register(tick, first_interval=1.0)
