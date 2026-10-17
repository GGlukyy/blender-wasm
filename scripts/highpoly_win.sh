#!/bin/bash
# P3: scripts/highpoly_win.sh <subdivisions>   -> out/win/hp_<n>_*.png, hp_<n>.log
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/highpoly_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node highpoly_test.mjs $1 $2" 2>&1 | tr -d '\r' | tail -16
mkdir -p "$ROOT/out/win"; cp "$W"/out/hp_$1* "$ROOT/out/win/" 2>/dev/null
