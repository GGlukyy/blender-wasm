#!/bin/bash
# EEVEE funkce přes WebGPU (barvy pixelů). Výstup: řádky OPS render_feat … PASS/FAIL/GAP
# RF_ONLY=volume_absorb,grease_pencil → jen vybrané případy (a plný log konzole do out/win/render_features_result.txt)
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/render_features_test.py" "$W/render_features_test.py"; cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
ALL=""
if [ -n "$RF_ONLY" ]; then
  sed -i "s/^state = {'i': 0/CASES = [c for c in CASES if c[0] in '$RF_ONLY'.split(',')]\nstate = {'i': 0/" "$W/render_features_test.py"; ALL="set OPS_ALL=1&& "
fi
cd "$W" && cmd.exe /c "${ALL}set OPS_PY=render_features_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/render_features_result.txt"
