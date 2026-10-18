#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/uv_hang_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=uv_hang_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/uv_hang_result.txt"

if [ "$(grep -a -c 'OPS uvhang ok' "$ROOT/out/win/uv_hang_result.txt")" -ge 3 ]; then echo "OPS uv_hang_summary PASS (select_edge_ring, select_overlap, stitch doběhnou)"; else echo "OPS uv_hang_summary FAIL"; fi
