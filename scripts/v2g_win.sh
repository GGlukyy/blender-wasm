#!/bin/bash
# V2g: lišta při nezapsaném obrázku (AVIF). Q="…" volitelně. PASS/FAIL v2g.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/v2g_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node v2g_test.mjs" 2>&1 | tr -d '\r' | grep -a "V2G\|v2g"
