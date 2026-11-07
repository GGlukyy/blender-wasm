#!/bin/bash
# H32: N startů a klik na MP (N, Q). Výstup: out/win/h32stress_result.txt. Q volitelně (např. tel=1).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/h32stress_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set Q=$Q&& set N=$N&& node h32stress_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/h32stress_result.txt"
cp "$W"/out/h32s_* "$ROOT/out/win/" 2>/dev/null
