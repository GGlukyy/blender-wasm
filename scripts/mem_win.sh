#!/bin/bash
# M1: baseline paměti s limity iPad Safari. Vyžaduje vite na :5173. Použití: mem_win.sh [idle_s]
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/mem_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mem_test.mjs $1" 2>&1 | tr -d '\r' | tail -14
