#!/bin/bash
# Čas překreslení (ms/frame) pro cube / Monkey+Subsurf3 / ico8. Výstup: řádky DRAWTIME.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/drawtime_test.mjs" "$W/"; rm -f "$W/capenv.json"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set SCENES=%SCENES%&& node drawtime_test.mjs" 2>&1 | tr -d '\r' | tail -14
