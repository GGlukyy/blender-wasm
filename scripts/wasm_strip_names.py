#!/usr/bin/env python3
"""Odstraní custom sekci `name` z .wasm (76 MB z 228 MB lean buildu). Prohlížeč drží bajty modulu v paměti
(lazy kompilace/tier-up), jména funkcí jsou jen pro stack trace. Plná verze zůstává v out/ pro ladění.
Použití: wasm_strip_names.py in.wasm out.wasm"""
import sys

def leb(d, i):
    r = s = 0
    while True:
        b = d[i]; i += 1
        r |= (b & 0x7f) << s; s += 7
        if not b & 0x80:
            return r, i

d = open(sys.argv[1], 'rb').read()
out = bytearray(d[:8]); i = 8; dropped = 0
while i < len(d):
    start = i; sid = d[i]; i += 1
    sz, j = leb(d, i); end = j + sz
    if sid == 0:
        n, k = leb(d, j)
        if d[k:k + n] == b'name':
            dropped += end - start; i = end; continue
    out += d[start:end]; i = end
open(sys.argv[2], 'wb').write(out)
print("dropped %d KB, %d -> %d" % (dropped // 1024, len(d), len(out)))
