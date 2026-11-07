#!/bin/bash
# Výběr objektu klikem: desktop (objpick_desktop.txt) a web (objpick_result.txt). DESKTOP=0 přeskočí desktop.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
cp "$ROOT"/scripts/objpick_common.py "$ROOT"/scripts/objpick_desktop.py "$ROOT"/scripts/objpick_test.mjs "$W/"; mkdir -p "$W/out"
cd "$W"
if [ "$DESKTOP" != "0" ]; then timeout 90 "/mnt/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" --factory-startup --window-geometry 0 0 1400 850 --python objpick_desktop.py 2>&1 | tr -d '\r' | grep -E "PICK|Traceback|Error" | tee "$ROOT/out/win/objpick_desktop.txt"; fi
cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node objpick_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/objpick_result.txt"
cp "$W"/out/objpick.png "$ROOT/out/win/" 2>/dev/null
