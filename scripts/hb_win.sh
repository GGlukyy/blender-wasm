#!/bin/bash
# T1: ./t1_procmem_win.sh solid|mp|mpslow [sekundy]
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/hb_test.mjs" "$W/"; mkdir -p "$W/out" "$ROOT/out/win"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node hb_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/hb.log" | tail -45
cp "$W"/out/t1_*.png "$ROOT/out/win/" 2>/dev/null
