#!/bin/bash
# H25b-a: klik na kost v Pose módu vybere tu kost? Výstup: out/win/obj_click_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/obj_click_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node obj_click_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/obj_click_result.txt"
cp "$W/out/obj_click.png" "$ROOT/out/win/" 2>/dev/null
