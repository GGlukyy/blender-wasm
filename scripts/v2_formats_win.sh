#!/bin/bash
# V2: F12 do formátů obrázku po jednom (JPEG, BMP, TIFF, EXR…). Q="…" volitelně. Výstup: OPS v2f <fmt> PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_formats_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_formats_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_formats_result.txt"
