#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/eevee_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
if [ -n "$CAPENV" ]; then echo "$CAPENV" > "$W/capenv.json"; else rm -f "$W/capenv.json"; fi
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_PY=eevee_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/eevee_sweep_result.txt"

# Souhrn: žádný shader se nesmí nepřeložit (regress_all vypíše posledních pár řádků)
NF=$(grep -a -c "translate FAILED\|tint-read FAIL\|shaderc FAIL\|ICE recovered" "$ROOT/out/win/eevee_sweep_result.txt")
NE=$(grep -a -c "OPS eevee_sweep ERR" "$ROOT/out/win/eevee_sweep_result.txt")
if grep -a -q "OPS_DONE" "$ROOT/out/win/eevee_sweep_result.txt" && [ "$NF" = 0 ] && [ "$NE" = 0 ]; then echo "OPS eevee_sweep_summary PASS (0 shaderů selhalo)"; else echo "OPS $(basename $0 _win.sh)_summary FAIL shader_failures=$NF python_errors=$NE"; fi
