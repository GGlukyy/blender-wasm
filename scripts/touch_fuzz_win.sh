#!/bin/bash
# Dotyk/Pencil test (CDP touch + pen) ve Windows Chrome. Výstup: out/win/touch_fuzz_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/touch_fuzz_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node touch_fuzz_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/touch_fuzz_result.txt"
cp "$W/out/touch_fuzz.png" "$ROOT/out/win/" 2>/dev/null; cp "$W/out/touch_fuzz.png" "$ROOT/out/win/" 2>/dev/null
