#!/bin/bash
# Všechny typy editorů (Windows Chrome). Vyžaduje běžící vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/editors_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node editors_test.mjs" 2>&1 | tr -d '\r' | tail -90
mkdir -p "$ROOT/out/win/edt"; cp "$W"/out/edt/*.png "$ROOT/out/win/edt/" 2>/dev/null
