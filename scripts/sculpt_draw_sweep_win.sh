#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/sculpt_draw_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=sculpt_draw_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/sculpt_draw_sweep_result.txt"

NF=$(grep -a -c "translate FAILED\|tint-read FAIL\|shaderc FAIL\|ICE recovered" "$ROOT/out/win/sculpt_draw_sweep_result.txt")
NL=$(grep -a -c "WEBGPU_LOST\|Uncaught" "$ROOT/out/win/sculpt_draw_sweep_result.txt")
if grep -a -q "OPS_DONE" "$ROOT/out/win/sculpt_draw_sweep_result.txt" && [ "$NF" = 0 ] && [ "$NL" = 0 ]; then echo "OPS sculpt_draw_sweep_summary PASS (sculpt/paint kreslení: maska, face sets, dyntopo, multires, 0 shaderů)"; else echo "OPS sculpt_draw_sweep_summary FAIL shader_failures=$NF lost_or_crash=$NL last=$(grep -a 'OPS sculpt_draw try' "$ROOT/out/win/sculpt_draw_sweep_result.txt" | tail -1)"; fi
