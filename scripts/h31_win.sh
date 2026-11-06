#!/bin/bash
# H31: střídání starých snímků při pohybu myši. Výstup: out/win/h31_result.txt, out/win/h31_*.png. VW/VH/Q volitelně.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/h31_test.mjs" "$W/"; mkdir -p "$W/out"; rm -f "$W"/out/h31_*
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set VW=${VW:-1400}&& set VH=${VH:-850}&& set Q=$Q&& set SCEN=$SCEN&& node h31_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/h31_result.txt"
cp "$W"/out/h31_* "$ROOT/out/win/" 2>/dev/null
