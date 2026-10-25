import bpy, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
def chk(n, ok, i=''): out('OPS fmt_%s %s %s' % (n, 'PASS' if ok else 'FAIL', i))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
D = '/opfs/home/fmt/'; os.makedirs(D, exist_ok=True)
out('OPS fmt_enum', [e.identifier for e in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items])
# images
img = bpy.data.images.new('t', 64, 64, alpha=True); img.pixels = [(i % 7) / 7.0 for i in range(64 * 64 * 4)]
for ext, fmt in (('png', 'PNG'), ('jpg', 'JPEG'), ('bmp', 'BMP'), ('tga', 'TARGA'), ('tif', 'TIFF'), ('exr', 'OPEN_EXR'), ('hdr', 'HDR'), ('webp', 'WEBP'), ('jp2', 'JPEG2000'), ('dds', 'DDS'), ('cin', 'CINEON')):
    p = D + 'img.' + ext
    try:
        img.file_format = fmt; img.save_render(p) if False else img.save(filepath=p) if False else None
        s = bpy.context.scene.render.image_settings; s.file_format = fmt
        img.save_render(p, scene=bpy.context.scene)
        ok = os.path.exists(p) and os.path.getsize(p) > 50
        if ok:
            r = bpy.data.images.load(p, check_existing=False); ok = r.size[0] == 64 and r.size[1] == 64
        chk('img_' + ext, ok, str(os.path.getsize(p)) if os.path.exists(p) else 'nofile')
    except Exception as e: chk('img_' + ext, False, str(e)[:80])
# geometry formats
def tryop(name, fn, path, imp):
    try:
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        fn(path); ok = os.path.exists(path) and os.path.getsize(path) > 100
        if ok and imp:
            n0 = len(bpy.data.objects); imp(path); ok = len(bpy.data.objects) > n0
        chk(name, ok, str(os.path.getsize(path)) if os.path.exists(path) else 'nofile')
    except Exception as e: chk(name, False, str(e)[:80])
O = bpy.ops
tryop('usd', lambda p: O.wm.usd_export(filepath=p), D + 'm.usd', lambda p: O.wm.usd_import(filepath=p))
tryop('usdc', lambda p: O.wm.usd_export(filepath=p), D + 'm.usdc', lambda p: O.wm.usd_import(filepath=p))
tryop('usda', lambda p: O.wm.usd_export(filepath=p), D + 'm.usda', lambda p: O.wm.usd_import(filepath=p))
tryop('abc', lambda p: O.wm.alembic_export(filepath=p), D + 'm.abc', lambda p: O.wm.alembic_import(filepath=p))
tryop('dae', lambda p: O.wm.collada_export(filepath=p), D + 'm.dae', lambda p: O.wm.collada_import(filepath=p))
tryop('ply', lambda p: O.wm.ply_export(filepath=p), D + 'm.ply', lambda p: O.wm.ply_import(filepath=p))
tryop('stl', lambda p: O.wm.stl_export(filepath=p), D + 'm.stl', lambda p: O.wm.stl_import(filepath=p))
tryop('obj', lambda p: O.wm.obj_export(filepath=p), D + 'm.obj', lambda p: O.wm.obj_import(filepath=p))
tryop('glb', lambda p: O.export_scene.gltf(filepath=p), D + 'm.glb', lambda p: O.import_scene.gltf(filepath=p))
tryop('fbx', lambda p: O.export_scene.fbx(filepath=p), D + 'm.fbx', lambda p: O.import_scene.fbx(filepath=p))
tryop('svg_gp', lambda p: None, D + 'none.svg', None) if False else None
out('OPS_DONE')
