#!/bin/bash
# P0.5: undo paměť (Q="cycles=0&webkit_sim=1&ipad=1", LV=subdiv). Výstup řádky UNDOT.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q LV OP WSLENV="Q:LV:OP${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/p0_undo_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node p0_undo_test.mjs" 2>&1 | tr -d '\r' | grep -a "UNDOT\|Error"
