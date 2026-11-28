#!/usr/bin/env python3
"""P0: velikost kódu wasm podle knihovny (code sekce + jména funkcí). Použití: wasm_size_by.py full.wasm"""
import sys, re
from collections import Counter
def leb(b, i):
    r = s = 0
    while True:
        x = b[i]; i += 1; r |= (x & 0x7f) << s; s += 7
        if x < 0x80: return r, i
b = open(sys.argv[1], 'rb').read(); i = 8; nimp = 0; bodies = []; names = {}; secs = Counter(); data = 0
while i < len(b):
    sid = b[i]; i += 1; sz, i = leb(b, i); end = i + sz
    if sid == 2:
        n, j = leb(b, i)
        for _ in range(n):
            l, j = leb(b, j); j += l; l, j = leb(b, j); j += l; k = b[j]; j += 1
            if k == 0: _, j = leb(b, j); nimp += 1
            elif k == 1: j += 1; f, j = leb(b, j); _, j = leb(b, j); j = j if not (f & 1) else leb(b, j)[1]
            elif k == 2: f, j = leb(b, j); _, j = leb(b, j); j = j if not (f & 1) else leb(b, j)[1]
            elif k == 3: j += 2
            else: j += 1; _, j = leb(b, j)
    elif sid == 10:
        n, j = leb(b, i)
        for _ in range(n): l, j = leb(b, j); bodies.append(l); j += l
    elif sid == 0:
        nl, j = leb(b, i); nm = b[j:j + nl].decode(); j += nl
        secs['custom:' + nm] += sz
        if nm == 'name':
            while j < end:
                sub = b[j]; j += 1; ssz, j = leb(b, j); send = j + ssz
                if sub == 1:
                    n, j = leb(b, j)
                    for _ in range(n):
                        idx, j = leb(b, j); l, j = leb(b, j); names[idx] = b[j:j + l].decode(errors='replace'); j += l
                j = send
    secs[sid] += sz; i = end
rules = [('cycles', r'ccl::'), ('openvdb', r'openvdb|nanovdb'), ('mantaflow', r'Manta::|mantaflow|MANTA'), ('python', r'^_?Py|^_?py|^list_|^dict_|^unicode|^long_|^float_|^set_|^tuple'),
 ('ffmpeg/x264', r'^ff_|^av_|^avcodec|^avformat|^sws_|^swr_|x264'), ('oiio', r'OpenImageIO|OIIO'), ('openexr', r'Imf_|Imath|IlmThread|Iex|exr_'),
 ('tbb', r'tbb::'), ('bullet', r'bt[A-Z]'), ('jolt', r'JPH::'), ('openSubdiv', r'OpenSubdiv'), ('manifold', r'manifold::'), ('quadriflow', r'qflow'),
 ('fftw', r'fftw'), ('gmp', r'__gmp|mpz_|mpq_'), ('eigen/ceres', r'Eigen::|ceres::'), ('numpy', r'npy|NPY|PyArray'), ('freestyle', r'Freestyle::'),
 ('compositor', r'compositor::'), ('nodes', r'blender::nodes::|blender::fn::'), ('gpu/draw/eevee', r'blender::gpu::|blender::draw::|blender::eevee::|blender::workbench::|GPU_|DRW_'),
 ('fbx/io', r'blender::io::|ufbx|fbx'), ('ed/ui', r'^ED_|^UI_|^ui_|blender::ed::|blender::ui::'), ('bke', r'^BKE_|blender::bke::'), ('rna', r'^rna_|^RNA_|^bpy_|pyrna'),
 ('libc++/std', r'^std::|^void std::'), ('blender other', r'blender::|^BLI_|^BM_|^bm_|^WM_|^wm_|^MOD_|^IMB_|^DNA_|^SEQ_')]
cnt = Counter(); tot = sum(bodies)
for k, sz in enumerate(bodies):
    nm = names.get(nimp + k, '')
    for lab, rx in rules:
        if re.search(rx, nm): cnt[lab] += sz; break
    else: cnt['?other'] += sz
print('file MB %.1f, code MB %.1f, funcs %d' % (len(b) / 2**20, tot / 2**20, len(bodies)))
for s, v in secs.most_common(8): print('  section', s, '%.1f MB' % (v / 2**20))
for lab, v in cnt.most_common(): print('%-16s %6.1f MB' % (lab, v / 2**20))
