import bpy, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
img = bpy.data.images.new('t', 64, 64, alpha=True)
s = bpy.context.scene.render.image_settings
out('OPS dpx start')
s.file_format = 'DPX'; out('OPS dpx set')
os.makedirs('/opfs/home/fmt', exist_ok=True)
img.save_render('/opfs/home/fmt/a.dpx', scene=bpy.context.scene); out('OPS dpx saved', os.path.getsize('/opfs/home/fmt/a.dpx'))
out('OPS dpx loading'); r = bpy.data.images.load('/opfs/home/fmt/a.dpx'); out('OPS dpx loaded', tuple(r.size))
out('OPS_DONE')
