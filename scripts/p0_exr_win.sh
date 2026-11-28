#!/bin/bash
# P0.3: EXR čtení/zápis (Q="cycles=0&webkit_sim=1&ipad=1"). PASS = řádky read + same=True.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/p0_exr_test.mjs" "$W/"
o=$(cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node p0_exr_test.mjs" 2>&1 | tr -d '\r' | grep -a "EXRT"); echo "$o"
echo "$o" | grep -q "EXRT read 1024\|EXRT read [0-9]" && echo "$o" | grep -q "same=True" && echo PASS p0_exr || echo FAIL p0_exr
