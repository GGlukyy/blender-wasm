#!/bin/bash
# Modal pad prstem (Windows Chrome). Vyžaduje běžící vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/autokbd_mid_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node autokbd_mid_test.mjs" 2>&1 | tr -d '\r' | tail -40
mkdir -p "$ROOT/out/win"; cp "$W"/out/autokbd_touch_mid.png "$ROOT/out/win/" 2>/dev/null
