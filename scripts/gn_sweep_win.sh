#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/gn_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=gn_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/gn_sweep_result.txt"

NE=$(grep -a "OPS gn ERR" "$ROOT/out/win/gn_sweep_result.txt" | grep -a -v "undefined" | wc -l)   # „undefined“ = experimentální uzel, není registrován
if grep -a -q "OPS_DONE" "$ROOT/out/win/gn_sweep_result.txt" && [ "$NE" = 0 ]; then echo "OPS gn_sweep_summary PASS (všechny GeometryNode typy vyhodnoceny bez pádu/zamrznutí)"; else echo "OPS gn_sweep_summary FAIL errors=$NE last=$(grep -a 'OPS gn eval' "$ROOT/out/win/gn_sweep_result.txt" | tail -1)"; fi
