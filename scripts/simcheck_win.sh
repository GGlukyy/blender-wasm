#!/bin/bash
# simcheck: viz scripts/simcheck_test.mjs. Výstup: out/win/simcheck_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/simcheck_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set Q=$Q&& set MODE=$MODE&& set HELPX=$HELPX&& node simcheck_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/simcheck_result.txt"
cp "$W"/out/simcheck_* "$ROOT/out/win/" 2>/dev/null
