#!/bin/bash
# H52: useknutá kopie assets v Cache API se pozná a stáhne znovu. Vyžaduje vite :5173. Q volitelně (webkit_sim=1).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/cachecorrupt_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node cachecorrupt_test.mjs" 2>&1 | tr -d '\r' | grep -a "CC\|PASS\|FAIL\|bin cache"
