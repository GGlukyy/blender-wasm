#!/bin/bash
# H53: měření paměti wasm při přehrávání soft body. FRAMES=120 SUBD=5 Q="ipad=1&webkit_sim=1&cycles=0" scripts/softmem_win.sh
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q FRAMES SUBD SBEXTRA WSLENV="Q:FRAMES:SUBD:SBEXTRA${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/softmem_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node softmem_test.mjs" 2>&1 | tr -d '\r' | grep -a "^SB"
