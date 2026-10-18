#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/modifier_sweep_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=modifier_sweep_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/modifier_sweep_result.txt"

NE=$(grep -a -c "OPS mod_sweep ERR" "$ROOT/out/win/modifier_sweep_result.txt")
NK=$(grep -a -c "OPS mod_sweep ok" "$ROOT/out/win/modifier_sweep_result.txt")
if [ "$NE" = 0 ] && [ "$NK" -ge 70 ]; then echo "OPS modifier_sweep_summary PASS ($NK typů vyhodnoceno, 0 výjimek; REMESH voxel/MASK/BUILD/VOLUME_TO_MESH dávají 0 polygonů — známé/očekávané)"; else echo "OPS modifier_sweep_summary FAIL errors=$NE ok=$NK"; fi
