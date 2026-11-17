# D1: .blend uložený Z WEBU (wasm32) — kolize adres bloků? Velká scéna (N objektů s materiály) -> save -> projít BHead a spočítat duplicitní `old`.
# Běží přes ops_test.mjs (OPS_PY). Výstup: OPS blendsave ... collisions=N (0 = OK).
import bpy, sys, struct, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
N = int(0) or 1000
bpy.ops.wm.read_factory_settings(use_empty=True)
for i in range(N):
    me = bpy.data.meshes.new('Me%d' % i)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('Ob%d' % i, me); bpy.context.scene.collection.objects.link(ob)
    m = bpy.data.materials.new('M%d' % i); m.use_nodes = True; me.materials.append(m)
bpy.ops.wm.save_as_mainfile(filepath='/tmp/big.blend', compress=False)
d = open('/tmp/big.blend', 'rb').read()
out('OPS blendsave header', d[:17], 'size', len(d))
if d[7:9].isdigit(): hs = int(d[7:9]); ptr8 = True
else: hs = 12; ptr8 = d[7:8] == b'-'
p = hs; seen = {}; blocks = 0; coll = 0
while p + 20 <= len(d):
    if hs == 17 or (hs == 12 and ptr8):
        if hs == 17: code, sdna, old, ln, nr = struct.unpack_from('<4siQqq', d, p); bh = 32
        else: code, ln, old, sdna, nr = struct.unpack_from('<4siQiI', d, p); bh = 24
    else:
        code, ln, old, sdna, nr = struct.unpack_from('<4siIiI', d, p); bh = 20
    p += bh
    if code == b'ENDB': break
    blocks += 1
    if old and old in seen: coll += 1
    seen.setdefault(old, 1)
    p += ln
out('OPS blendsave N=%d blocks=%d unique=%d dups=%d (desktop obj1000 = 5991 identische, legitimní) bh=%d' % (N, blocks, len(seen), coll, bh))
out('OPS_DONE')
