#!/bin/bash
# F6: další exportéry (UV layout PNG/SVG/EPS, OBJ+MTL, BVH, GP SVG, SVG import). GP PDF (od 28. 11. libharu). Q volitelně.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_exp2_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_exp2_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_exp2_result.txt"
R="$ROOT/out/win/v2_exp2_result.txt"
bad=$(grep -a "^OPS v2e2" "$R" | grep -v "FINISHED'\] file=True\|mtl_exists True\|curves 28\|pdf_valid True")
if grep -q OPS_DONE "$R" && [ -z "$bad" ]; then echo "PASS v2_exp2"; else echo "FAIL v2_exp2: $bad"; fi
