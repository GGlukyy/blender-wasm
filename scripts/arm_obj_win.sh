#!/bin/bash
# H25c: klik na kost v Pose módu vybere tu kost? Výstup: out/win/arm_obj_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/arm_obj_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node arm_obj_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/arm_obj_result.txt"
cp "$W/out/arm_obj.png" "$ROOT/out/win/" 2>/dev/null
