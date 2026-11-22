#!/bin/bash
# Porovná registrované bpy.types / operátory web vs desktop 5.3.0 (vyžaduje běžící vite :5173). Výstup: out/win/api_diff.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); D="/mnt/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe"
cp "$ROOT/scripts/api_diff_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
( cd "$W" && "$D" -b --factory-startup --python api_diff_test.py 2>&1 | tr -d '\r' | grep -a "^APIDIFF" > /tmp/api_desk.txt )
( cd "$W" && cmd.exe /c "set OPS_LINE=400000&& set OPS_ALL=1&& set OPS_PY=api_diff_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -a "^APIDIFF" > /tmp/api_web.txt )
python3 - <<'PY' | tee "$ROOT/out/win/api_diff.txt"
import json
def load(p):
    d = {}
    for l in open(p): _, k, rest = l.split(' ', 2); d[k] = json.loads(rest)
    return d
w, d = load('/tmp/api_web.txt'), load('/tmp/api_desk.txt')
for k in ('types', 'ops'):
    a, b = set(w[k]), set(d[k]); print(k, 'web', len(a), 'desktop', len(b), 'jen desktop:', sorted(b - a), 'jen web:', sorted(a - b))
for k in w['enums']: print('enum', k, 'shoda' if w['enums'][k] == d['enums'][k] else 'ROZDÍL')
PY
