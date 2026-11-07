#!/bin/bash
# B1: prohlídka ?auto=tour v Chrome. Výstup: out/win/tour_result.txt. Q volitelně (např. tel=1).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q WSLENV="Q${WSLENV:+:$WSLENV}"  # WSLENV: "&" v Q by v cmd.exe rozdělilo příkaz
cp "$ROOT/scripts/tour_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node tour_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/tour_result.txt"
