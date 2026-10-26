#!/bin/bash
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/sculpt_mem_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set DUR=%DUR%&& set FREEDBG=%FREEDBG%&& set BGWHY=%BGWHY%&& set ICO=%ICO%&& node sculpt_mem_test.mjs" 2>&1 | tr -d '\r' | tail -30
cp "$W"/out/sculptmem.png "$ROOT/out/win/" 2>/dev/null
