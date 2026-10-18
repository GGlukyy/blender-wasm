#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/saveload_all_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=saveload_all_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/saveload_all_result.txt"

if grep -a -q "OPS saveload compare PASS" "$ROOT/out/win/saveload_all_result.txt" && grep -a -q "OPS saveload details PASS" "$ROOT/out/win/saveload_all_result.txt" && grep -a -q "OPS saveload resaved" "$ROOT/out/win/saveload_all_result.txt"; then echo "OPS saveload_all_summary PASS (bohatá scéna: uložit → otevřít → stejné datablocky → znovu uložit)"; else echo "OPS saveload_all_summary FAIL: $(grep -a 'OPS saveload' "$ROOT/out/win/saveload_all_result.txt" | tail -2 | tr '\n' ' ')"; fi
