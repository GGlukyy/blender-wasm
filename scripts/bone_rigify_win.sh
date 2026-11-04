#!/bin/bash
# H25c: klik na kost v Pose módu vybere tu kost? Výstup: out/win/bone_rigify_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bone_rigify_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node bone_rigify_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/bone_rigify_result.txt"
cp "$W/out/bone_rigify.png" "$ROOT/out/win/" 2>/dev/null
