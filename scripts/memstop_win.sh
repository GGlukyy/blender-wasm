#!/bin/bash
# H53: červená RAM zastaví přehrávání. EXPECT=keep (zelená) / výchozí stop (Q s membase=3500). Vyžaduje vite :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q EXPECT WSLENV="Q:EXPECT${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/memstop_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node memstop_test.mjs" 2>&1 | tr -d '\r' | grep -a "^MS\|PASS\|FAIL\|WEB_MEM"
