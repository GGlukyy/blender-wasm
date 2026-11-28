#!/bin/bash
# P0: velké ArrayBuffery hlavního vlákna (Chrome). Q="cycles=0&webkit_sim=1&ipad=1"
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q SNAP WSLENV="Q:SNAP${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/p0_heap_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node p0_heap_test.mjs" 2>&1 | tr -d '\r' | grep -a "^HEAP"
