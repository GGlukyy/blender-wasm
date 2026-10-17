#!/bin/bash
# Interaktivní nástroje (G/R/S, Shift+D, Tab, E, Ctrl+B, Ctrl+Z...) ve web Blenderu. Výstup: out/win/interactive_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/interactive_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node interactive_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/interactive_result.txt"
cp "$W/out/interactive_end.png" "$ROOT/out/win/" 2>/dev/null
