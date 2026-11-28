#!/usr/bin/env python3
"""P0: jména funkcí wasm podle indexu (custom sekce `name`). Použití: wasm_func_names.py full.wasm idx [idx...]"""
import sys
def leb(b, i):
    r = s = 0
    while True:
        x = b[i]; i += 1; r |= (x & 0x7f) << s; s += 7
        if x < 0x80: return r, i
b = open(sys.argv[1], 'rb').read(); want = set(int(x) for x in sys.argv[2:]); i = 8; names = {}
while i < len(b):
    sid = b[i]; i += 1; sz, i = leb(b, i); end = i + sz
    if sid == 0:
        nl, j = leb(b, i); nm = b[j:j + nl].decode(); j += nl
        if nm == 'name':
            while j < end:
                sub = b[j]; j += 1; ssz, j = leb(b, j); send = j + ssz
                if sub == 1:
                    n, j = leb(b, j)
                    for _ in range(n):
                        idx, j = leb(b, j); l, j = leb(b, j)
                        if idx in want: names[idx] = b[j:j + l].decode(errors='replace')
                        j += l
                j = send
    i = end
for w in sorted(want): print(w, names.get(w, '?'))
