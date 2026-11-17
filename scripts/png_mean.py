#!/usr/bin/env python3 -I
# png_mean.py soubor x0 y0 x1 y1 → průměr R G B v obdélníku (PNG 8bit RGB/RGBA, bez prokládání; jen stdlib).
import sys, zlib, struct
f, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:6])
d = open(f, 'rb').read(); p = 8; idat = b''; w = h = ct = 0
while p < len(d):
    n, t = struct.unpack('>I4s', d[p:p + 8]); b = d[p + 8:p + 8 + n]; p += 12 + n
    if t == b'IHDR': w, h, bd, ct = struct.unpack('>IIBB', b[:10])
    elif t == b'IDAT': idat += b
bpp = {2: 3, 6: 4}[ct]; raw = zlib.decompress(idat); stride = w * bpp; rows = []; prev = bytearray(stride); q = 0
for _ in range(h):
    ft = raw[q]; line = bytearray(raw[q + 1:q + 1 + stride]); q += 1 + stride
    for i in range(stride):
        a = line[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
        if ft == 1: line[i] = (line[i] + a) & 255
        elif ft == 2: line[i] = (line[i] + b) & 255
        elif ft == 3: line[i] = (line[i] + (a + b) // 2) & 255
        elif ft == 4:
            pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
            line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
    rows.append(line); prev = line
s = [0, 0, 0]; n = 0
for y in range(y0, y1):
    for x in range(x0, x1):
        for k in range(3): s[k] += rows[y][x * bpp + k]
        n += 1
print(' '.join('%.1f' % (v / n) for v in s))
