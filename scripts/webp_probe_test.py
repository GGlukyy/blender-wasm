# V2f: WEBP zápis/čtení přímo přes bpy (diagnostika). Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys
def out(*a): print(*a); sys.stdout.flush()
im = bpy.data.images.new('w', 16, 16, alpha=True); im.pixels = [0.5, 0.25, 0.1, 1.0] * 256
for q in (90, 100):
    sc = bpy.context.scene; s = sc.render.image_settings; s.file_format = 'WEBP'; s.quality = q
    p = '/tmp/w%d.webp' % q
    try:
        im.save_render(p, scene=sc); out('OPS webp save', q, os.path.exists(p) and os.path.getsize(p))
    except Exception as e: out('OPS webp save ERR', q, e)
    try:
        if os.path.exists(p): r = bpy.data.images.load(p); out('OPS webp load', tuple(r.size), [round(x, 3) for x in r.pixels[:4]])
    except Exception as e: out('OPS webp load ERR', e)
out('OPS_DONE')
