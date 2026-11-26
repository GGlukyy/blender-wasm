#!/bin/bash
# U3: obrázek ze zařízení není růžový (ani po uložení/otevření .blend). Vyžaduje vite :5173. Q=webkit_sim=1 volitelně (výchozí Q=ipad=1).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/u3_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node u3_test.mjs" 2>&1 | tr -d '\r' | tail -30
mkdir -p "$ROOT/out/win"; cp "$W"/out/u3_*.png "$ROOT/out/win/" 2>/dev/null
