#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/nodetypes_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=nodetypes_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/nodetypes_sweep_result.txt"

if grep -a -q "OPS_DONE" "$ROOT/out/win/nodetypes_sweep_result.txt" && ! grep -a -q "OPS nodetypes ERR\|Uncaught" "$ROOT/out/win/nodetypes_sweep_result.txt"; then echo "OPS nodetypes_sweep_summary PASS (všechny Compositor/Texture uzly se vytvoří bez pádu)"; else echo "OPS nodetypes_sweep_summary FAIL"; fi
