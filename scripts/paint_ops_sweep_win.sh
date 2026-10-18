#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/paint_ops_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=paint_ops_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/paint_ops_sweep_result.txt"

if grep -a -q "OPS_DONE ok=" "$ROOT/out/win/paint_ops_sweep_result.txt"; then echo "OPS paint_ops_sweep_summary PASS (dokončeno bez pádu/zamrznutí)"; else echo "OPS paint_ops_sweep_summary FAIL (nedoběhlo — poslední: $(grep -a 'paint_sweep try' "$ROOT/out/win/paint_ops_sweep_result.txt" | tail -1))"; fi
