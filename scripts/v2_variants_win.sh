#!/bin/bash
# V2: F12 do formátů obrázku po jednom (JPEG, BMP, TIFF, EXR…). Q="…" volitelně. Výstup: OPS v2f <fmt> PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_variants_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_variants_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_variants_result.txt"
# porovnání s desktopem 5.3.0 (scripts/v2_variants_desk.txt; vygenerováno blender.exe -b s DESK=1)
R="$ROOT/out/win/v2_variants_result.txt"; grep -a "^OPS v2v [a-z0-9_]* [0-9N]" "$R" | sed 's/^OPS v2v //' | sort > /tmp/v2v_web.txt
grep -a "^OPS v2v [a-z0-9_]* [0-9N]" "$ROOT/scripts/v2_variants_desk.txt" | sed 's/^OPS v2v //' | sort > /tmp/v2v_d.txt
if grep -q OPS_DONE "$R" && diff /tmp/v2v_d.txt /tmp/v2v_web.txt; then echo "PASS v2_variants ($(wc -l < /tmp/v2v_web.txt) variant = desktop)"; else echo "FAIL v2_variants (rozdíl proti desktopu výše)"; fi
