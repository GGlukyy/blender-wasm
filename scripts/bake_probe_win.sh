#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bake_probe_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=bake_probe_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/bake_probe_result.txt"

NF=$(grep -a -c "OPS bake_probe .* FAIL" "$ROOT/out/win/bake_probe_result.txt")
if grep -a -q "OPS_DONE" "$ROOT/out/win/bake_probe_result.txt" && [ "$NF" = 0 ]; then echo "OPS bake_probe_summary PASS (probe bake, EXR/HDR/JPEG/TGA/BMP/TIFF ukládání, boolean, remesh… ; AVIF a FFMPEG video v buildu nejsou)"; else echo "OPS bake_probe_summary FAIL count=$NF"; fi
