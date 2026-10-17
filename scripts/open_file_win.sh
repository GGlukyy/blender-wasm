#!/bin/bash
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$W/blends"; cp "$ROOT"/scripts/testdata/blend64_ref.blend "$W/blends/"; cp "$ROOT/scripts/open_file_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node open_file_test.mjs blends\\blend64_ref.blend" 2>&1 | tr -d '\r' | tail -4
cp "$W"/out/open_*.png "$ROOT/out/win/" 2>/dev/null
