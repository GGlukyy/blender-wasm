#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/pymods_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=pymods_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/pymods_result.txt"

if grep -a -q "OPS_DONE" "$ROOT/out/win/pymods_result.txt" && ! grep -a -q "OPS pymod ERR" "$ROOT/out/win/pymods_result.txt"; then echo "OPS pymods_summary PASS (každý import buď funguje, nebo rychle vyhodí ImportError; sqlite3 už nezavěsí)"; else echo "OPS pymods_summary FAIL last=$(grep -a 'OPS pymod try' "$ROOT/out/win/pymods_result.txt" | tail -1)"; fi
