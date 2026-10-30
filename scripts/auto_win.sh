#!/bin/bash
# Spustí scripts/auto_test.mjs ve Windows Chrome (skutečná GPU). Výstup: out/win/p2_<tag>_*.png
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/auto_test.mjs" "$W/"; mkdir -p "$W/out"
# CAPENV='{"WGPU_LOG_DRAW":""}' → env proměnné pro Blender (window.__CAPENV)
if [ -n "$CAPENV" ]; then echo "$CAPENV" > "$W/capenv.json"; else rm -f "$W/capenv.json"; fi
cd "$W" && CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe' PW=playwright-core \
  cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node auto_test.mjs $*" 2>&1 | tail -20
mkdir -p "$ROOT/out/win"; cp "$W"/out/auto_* "$ROOT/out/win/" 2>/dev/null
