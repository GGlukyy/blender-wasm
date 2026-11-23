#!/bin/bash
# M2: ukazatel RAM — zelená/žlutá/červená (+ autosave při červené). Q=webkit_sim=1 volitelně. Vyžaduje vite :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q EXPECT FONTBAD WSLENV="Q:EXPECT:FONTBAD${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/memhud_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node memhud_test.mjs" 2>&1 | tr -d '\r' | grep -a "FONT\|MEMHUD\|PASS\|FAIL"
