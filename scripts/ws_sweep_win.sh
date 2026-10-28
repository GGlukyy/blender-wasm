#!/bin/bash
# Spustí scripts/ws_sweep_test.mjs ve Windows Chrome. $1 = seed|verify. seed -> demo/public/wgsl-cache.json
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
# seed MERGUJE do existujícího demo/public/wgsl-cache.json (smaž ho ručně pro čistý start)
cp "$ROOT/scripts/ws_sweep_test.mjs" "$W/"; mkdir -p "$W/out"; rm -f "$W/capenv.json"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ws_sweep_test.mjs $1" 2>&1 | tr -d '\r'
mkdir -p "$ROOT/out/win"; cp "$W"/out/wgsl_* "$ROOT/out/win/" 2>/dev/null
