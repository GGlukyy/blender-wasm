#!/bin/bash
# Test výkonového panelu (?perf=1) ve Windows Chrome. Výstup: out/win/perf_panel.png
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/perf_panel_test.mjs" "$W/"; mkdir -p "$W/out"; rm -f "$W/capenv.json"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set SHADING=%SHADING%&& set TEXLOG=%TEXLOG%&& set POOL=%POOL%&& node perf_panel_test.mjs" 2>&1 | tr -d '\r' | tail -24
mkdir -p "$ROOT/out/win"; cp "$W"/out/perf_panel*.png "$ROOT/out/win/"
