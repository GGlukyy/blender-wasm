#!/bin/bash
# u2: viz scripts/u2_test.mjs. Výstup: out/win/u2_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/u2_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set Q=$Q&& set MODE=$MODE&& set HELPX=$HELPX&& node u2_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/u2_result.txt"
cp "$W"/out/u2_* "$ROOT/out/win/" 2>/dev/null
