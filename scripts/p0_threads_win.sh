#!/bin/bash
# P0: seznam spuštěných pthreadů (index funkce). Q="cycles=1&webkit_sim=1&ipad=1"; jména: python3 scripts/wasm_func_names.py
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q SECS WSLENV="Q:SECS${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/p0_threads_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node p0_threads_test.mjs" 2>&1 | tr -d '\r'
