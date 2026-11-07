#!/bin/bash
# iPad soft klávesnice: diakritika přes input bez keydown (Windows Chrome, ?touch=1). Q volitelně (webkit_sim=1). Vyžaduje vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/kbdtext_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node kbdtext_test.mjs" 2>&1 | tr -d '\r' | tail -12
mkdir -p "$ROOT/out/win"; cp "$W"/out/kbdtext.png "$ROOT/out/win/" 2>/dev/null
