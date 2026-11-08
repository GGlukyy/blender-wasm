#!/bin/bash
# B3k: ./mplite_reload_win.sh (Q volitelně). EEVEE lite po File ▸ New a po otevření souboru.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/mplite_reload_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mplite_reload_test.mjs" 2>&1 | tr -d '\r' | tail -8
