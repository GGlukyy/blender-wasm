#!/usr/bin/env python3
# Delta debugging UI fuzzu: najde minimální podmnožinu akcí 1..N-1, která pořád shodí wasm (hledá text MARK ve výstupu).
# Použití: python3 scripts/ddmin.py SEED N MARK   (např. 12 241 WM_gesture_end). Log: out/ddmin.log
import subprocess, os, sys
seed, N, mark = sys.argv[1], int(sys.argv[2]), sys.argv[3]
log = open('out/ddmin.log', 'a')
def ranges(ids):
    ids = sorted(ids); out = []; i = 0
    while i < len(ids):
        j = i
        while j + 1 < len(ids) and ids[j + 1] == ids[j] + 1: j += 1
        out.append(str(ids[i]) if i == j else '%d-%d' % (ids[i], ids[j])); i = j + 1
    return ','.join(out)
def crashes(keep):
    skip = [i for i in range(1, N) if i not in keep]
    env = dict(os.environ, FUZZ_FULL='1', FUZZ_SEED=seed, FUZZ_SECS='300', FUZZ_N=str(N), FUZZ_SKIP=ranges(skip), FUZZ_STACK='1', TAILN='200')
    r = subprocess.run(['bash', 'scripts/ui_fuzz_win.sh'], env=env, capture_output=True, text=True, timeout=400).stdout
    ok = mark in r
    print('keep=%d crash=%s' % (len(keep), ok), file=log, flush=True); return ok
cur = list(range(1, N)); n = 2
assert crashes(set(cur)), 'výchozí sekvence nepadá'
while len(cur) >= 2:
    size = max(1, len(cur) // n); chunks = [cur[i:i + size] for i in range(0, len(cur), size)]; reduced = False
    for ch in chunks:
        comp = [x for x in cur if x not in set(ch)]
        if comp and crashes(set(comp)):
            cur = comp; n = max(n - 1, 2); reduced = True; print('SKIP-OK now %d: %s' % (len(cur), ranges(cur)), file=log, flush=True); break
    if not reduced:
        if n >= len(cur): break
        n = min(len(cur), n * 2)
print('MINIMAL (%d): %s' % (len(cur), ranges(cur)), file=log, flush=True)
