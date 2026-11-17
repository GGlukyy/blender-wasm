#!/usr/bin/env python3 -I
"""D1a: kolik BHead adres (64bit .blend) po zkrácení `(addr >> 3) & 0xffffffff` koliduje (= web wasm32 build soubor odmítne).
Použití: blend_addr_scan.py soubor.blend [...]   Vypíše: soubor, bloků, unikátních adres, kolizí. Zvládá nekomprimované, gzip, zstd (CLI zstd)."""
import sys, struct, gzip, subprocess

def load(path):
    d = open(path, 'rb').read()
    if d[:2] == b'\x1f\x8b': return gzip.decompress(d)
    if d[:4] == b'\x28\xb5\x2f\xfd': return subprocess.run(['zstd', '-dc'], input=d, capture_output=True, check=True).stdout
    return d

def scan(path):
    d = load(path)
    if d[:7] != b'BLENDER': return None
    if d[7:9].isdigit():  # nový formát: BLENDER17-01v0503
        hs = int(d[7:9]); ptr8 = True; little = d[10:11] == b'1' or d[9:10] == b'-' and d[10:12] == b'01'
        p = hs
        bh = 32  # LargeBHead8: code[4] sdna(4) old(8) len(8) nr(8)
        fmt = '<4siqqq'
        off_old = None
    else:  # starý: BLENDER-v305 / _
        ptr8 = d[7:8] == b'-'; p = 12
        bh = 24 if ptr8 else 20
        fmt = '<4siQiI' if ptr8 else None
    seen = {}; blocks = 0; coll = 0
    while p + bh <= len(d):
        if bh == 32:
            code, sdna, old, ln, nr = struct.unpack_from('<4siQqq', d, p)
        else:
            code, ln, old, sdna, nr = struct.unpack_from('<4siQiI', d, p)
        p += bh
        if code == b'ENDB': break
        blocks += 1
        k = (old >> 3) & 0xffffffff
        if old and k in seen and seen[k] != old: coll += 1
        seen.setdefault(k, old)
        p += ln
    return blocks, len(seen), coll

for f in sys.argv[1:]:
    try:
        r = scan(f)
    except Exception as e:
        r = 'ERR %s' % e
    print(f, r)
