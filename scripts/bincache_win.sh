#!/bin/bash
export Q WSLENV="Q${WSLENV:+:$WSLENV}"  # např. Q=webkit_sim=1; vyžaduje vite na :5173
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bincache_test.mjs" "$W/"; mkdir -p "$W/out"; rm -rf "$W/bincache_profile"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node bincache_test.mjs bincache_profile" 2>&1 | stdbuf -oL tr -d '\r'
