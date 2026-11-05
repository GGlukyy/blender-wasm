#!/bin/bash
# S1b: příznaky Mac Safari / bez dual-source. Výstup: out/win/s1b_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/s1b_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node s1b_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/s1b_result.txt"
