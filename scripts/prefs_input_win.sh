#!/bin/bash
# Edit ▸ Preferences ▸ Input ▸ Emulate 3 Button Mouse myší (dřív pád „function signature mismatch“). Výstup: PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/prefs_input_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set PREF_TAB_Y=338&& set PREF_CB_X=477&& set PREF_CB_Y=155&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node prefs_input_test.mjs" 2>&1 | tr -d '\r' | tail -3
cp "$W"/out/prefs_in_*.png "$ROOT/out/win/" 2>/dev/null
