#!/bin/bash
# U3: File ▸ Open = rovnou systémový výběr souboru (mock showOpenFilePicker), žádný dialog. Vyžaduje vite :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$W/blends" "$W/out"; cp "$ROOT"/scripts/testdata/blend64_ref.blend "$W/blends/"; cp "$ROOT/scripts/u3_open_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node u3_open_test.mjs blends\\blend64_ref.blend" 2>&1 | tr -d '\r' | tail -4
cp "$W"/out/u3_open*.png "$ROOT/out/win/" 2>/dev/null
