#!/bin/bash
# P2b test: scripts/blend_open_win.sh  (výchozí: ref + collide)
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$W/blends"; cp "$ROOT"/scripts/testdata/blend64_*.blend "$W/blends/"; cp "$ROOT/scripts/blend_open_test.mjs" "$W/"
FILES=${*:-"blends\\blend64_ref.blend blends\\blend64_collide.blend"}
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node blend_open_test.mjs $FILES" 2>&1 | tr -d '\r' | tail -8
