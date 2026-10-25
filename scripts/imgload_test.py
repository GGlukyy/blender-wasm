import bpy, sys, os, time
def out(*a):
    print(*a); sys.stdout.flush()
D = '/opfs/home/fmt2/'; os.makedirs(D, exist_ok=True)
img = bpy.data.images.new('t', 2048, 2048, alpha=True); img.pixels = [(i % 13) / 13.0 for i in range(2048 * 2048 * 4)]
S = bpy.context.scene.render.image_settings
for fmt, ext in (('PNG', 'png'), ('JPEG', 'jpg'), ('TARGA_RAW', 'tga'), ('IRIS', 'rgb'), ('OPEN_EXR_MULTILAYER', 'exr'), ('AVIF', 'avif'), ('TIFF', 'tif')):
    p = D + 'big_' + fmt + '.' + ext
    try:
        S.file_format = fmt; t = time.time(); img.save_render(p, scene=bpy.context.scene); ts = time.time() - t
        t = time.time(); r = bpy.data.images.load(p, check_existing=False); r.pixels[0]; tl = time.time() - t
        out('OPS imgload %-20s save %.2fs load %.2fs size %s' % (fmt, ts, tl, tuple(r.size)))
    except Exception as e: out('OPS imgload %-20s FAIL %s' % (fmt, str(e)[:70]))
out('OPS_DONE')
