#!/bin/bash
# K1: rychlé tažení plochy. Použití: drag_win.sh [dur_s]
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/drag_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set DPR=$DPR&& set NOPOOL=$NOPOOL&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node drag_test.mjs $1" 2>&1 | tr -d '\r' | tail -14
