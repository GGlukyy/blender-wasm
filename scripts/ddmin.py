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
    try:
        r = subprocess.run(['bash', 'scripts/ui_fuzz_win.sh'], env=env, capture_output=True, text=True, timeout=400).stdout
    except subprocess.TimeoutExpired:   # zaseknutý běh (nepadl) → bereme jako „nepadá“, zabít zbylé procesy
        subprocess.run(['cmd.exe', '/c', 'taskkill /F /IM node.exe'], capture_output=True); subprocess.run(['cmd.exe', '/c', 'taskkill /F /IM chrome.exe'], capture_output=True)
        print('TIMEOUT (bráno jako nepadá)', file=log, flush=True); return False
    ok = mark in r
    print('keep=%d crash=%s' % (len(keep), ok), file=log, flush=True); return ok
cur = list(range(1, N)); n = 2
if len(sys.argv) > 4:   # navázání: seznam indexů z logu, např. 31-60,151-180,211-240
    cur = []
    for part in sys.argv[4].split(','):
        a, _, b = part.partition('-'); cur += list(range(int(a), int(b or a) + 1))
else:
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
