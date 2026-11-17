# D1: hledá MALÝ .blend z desktopu 5.3.0 s kolizí adres po zkrácení >>3 (web wasm32). blender.exe -b --factory-startup --python blend_collide_gen.py -- <složka>
# Scéna: N krychlí Ob<s>_<i> s vlastním meshem Me<s>_<i> a materiálem M<s>_<i>. Zkouší soli, dokud sken nenajde >=1 kolizi.
import bpy, sys, os, struct, bmesh
out = sys.argv[sys.argv.index('--') + 1]
N = 150
def scan(path):
    d = open(path, 'rb').read(); p = 17; seen = {}; coll = 0
    while True:
        code, sdna, old, ln, nr = struct.unpack_from('<4siQqq', d, p); p += 32
        if code == b'ENDB': break
        k = (old >> 3) & 0xffffffff
        if old and k in seen and seen[k] != old: coll += 1
        seen.setdefault(k, old); p += ln
    return coll
for salt in range(400):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for i in range(N):
        me = bpy.data.meshes.new('Me%d_%d' % (salt, i))
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('Ob%d_%d' % (salt, i), me); bpy.context.scene.collection.objects.link(ob)
        m = bpy.data.materials.new('M%d_%d' % (salt, i)); me.materials.append(m)
    path = os.path.join(out, 'collide_small.blend')
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    # sken na nekomprimované kopii
    raw = os.path.join(out, 'collide_raw.blend'); bpy.ops.wm.save_as_mainfile(filepath=raw, compress=False, copy=True)
    c = scan(raw)
    print('SALT', salt, 'collisions', c, 'size', os.path.getsize(path)); sys.stdout.flush()
    if c > 0:
        print('FOUND', salt, c); break
