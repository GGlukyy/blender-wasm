#!/bin/bash
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/glsl_dump_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node glsl_dump_test.mjs" 2>&1 | tr -d '\r' | tail -60
cp "$W"/out/glsl_dump*.png "$ROOT/out/win/" 2>/dev/null
cp "$W"/out/glsl_dump.txt "$ROOT/out/win/" 2>/dev/null
