#!/bin/bash
# Checklist 22: barva materiálu je vidět v Material Preview / Rendered. Výstup: MATCOLOR + PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/matcolor_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node matcolor_test.mjs" 2>&1 | tr -d '\r' | tail -8
mkdir -p "$ROOT/out/win"; cp "$W"/out/matcolor_*.png "$ROOT/out/win/" 2>/dev/null
