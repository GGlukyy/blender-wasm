#!/bin/bash
# B3-POJISTKA: ./crashsave_win.sh shading|workspace (Q volitelně, např. webkit_sim=1). Vyžaduje vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/crashsave_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node crashsave_test.mjs ${1:-shading}" 2>&1 | tr -d "\r" | tee "$ROOT/out/win/crashsave_$1.log" | grep -E "PASS|FAIL|CS |AUTOSAVE|RESTORE|Error" | tail -20
