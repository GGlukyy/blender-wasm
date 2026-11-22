#!/bin/bash
# H50e: rozklad paměti Chrome po startu. Q="pool=8" atd. Výstup out/win/h50e_<SUF>.log
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q BARGS WSLENV="Q:BARGS${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/h50e_test.mjs" "$W/"; mkdir -p "$ROOT/out/win"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node h50e_test.mjs ${1:-30}" 2>&1 | tr -d '\r' | grep -a "^ST\|^ROZKLAD\|^BENCH" | tee "$ROOT/out/win/h50e_${SUF:-x}.log" | cut -c1-900
