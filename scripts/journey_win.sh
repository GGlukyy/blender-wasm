#!/bin/bash
# Cesty běžného uživatele (VELKA_ZKOUSKA D). journey_win.sh [model,scene,...|all]. Výstup: out/win/journey_result.txt, out/win/jr_*.png
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
export Q J4DBL J4EV WSLENV="Q:J4DBL:J4EV${WSLENV:+:$WSLENV}"
cp "$ROOT/scripts/journey_test.mjs" "$ROOT/scripts/modtab.py" "$W/"; mkdir -p "$W/out"; rm -f "$W"/out/jr_*
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node journey_test.mjs ${1:-all}" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/journey_result.txt"
cp "$W"/out/jr_* "$ROOT/out/win/" 2>/dev/null
