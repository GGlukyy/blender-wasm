#!/bin/bash
# H30: snap/proportional po startu + klik na MP. Výstup: out/win/h30_result.txt. Q volitelně (např. tel=1).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/h30_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set Q=$Q&& set SCEN=$SCEN&& set SNAPON=$SNAPON&& node h30_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/h30_result.txt"
cp "$W"/out/h30_* "$ROOT/out/win/" 2>/dev/null
