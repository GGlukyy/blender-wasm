# 5.3: proč selže Image.save (PNG)? vypíše výjimku + co Blender napsal do konzole
import bpy, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
def tick():
    try:
        img = bpy.data.images.new('png_rt', 16, 16)
        img.filepath_raw = '/tmp/rt.png'; img.file_format = 'PNG'
        img.save()
        out('OPS img PASS', os.path.getsize('/tmp/rt.png'))
    except BaseException as e:
        out('OPS img FAIL', repr(e)[:300])
    for fmt, ext in (('JPEG', 'jpg'), ('BMP', 'bmp'), ('TARGA', 'tga')):
        try:
            img.file_format = fmt; img.filepath_raw = '/tmp/rt.' + ext; img.save(); out('OPS img', fmt, 'PASS', os.path.getsize('/tmp/rt.' + ext))
        except BaseException as e:
            out('OPS img', fmt, 'FAIL', repr(e)[:200])
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=6.0)
