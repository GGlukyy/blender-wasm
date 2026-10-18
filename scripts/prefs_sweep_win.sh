#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/prefs_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=prefs_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/prefs_sweep_result.txt"

NT=$(( $(grep -a -c "Traceback" "$ROOT/out/win/prefs_sweep_result.txt") - $(grep -a -c "addon_utils.py\", line 543" "$ROOT/out/win/prefs_sweep_result.txt") ))
NF=$(grep -a -c "translate FAILED\|tint-read FAIL\|shaderc FAIL\|ICE recovered" "$ROOT/out/win/prefs_sweep_result.txt")
if grep -a -q "OPS_DONE" "$ROOT/out/win/prefs_sweep_result.txt" && [ "$NT" = 0 ] && [ "$NF" = 0 ]; then echo "OPS prefs_sweep_summary PASS (všechny přepínače Preferences, 0 Traceback, 0 shaderů)"; else echo "OPS prefs_sweep_summary FAIL tracebacks=$NT shader_failures=$NF done=$(grep -a -c OPS_DONE "$ROOT/out/win/prefs_sweep_result.txt") last=$(grep -a 'OPS prefs set' "$ROOT/out/win/prefs_sweep_result.txt" | tail -1)"; fi
