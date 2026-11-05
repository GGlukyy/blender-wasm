#!/bin/bash
# H25d: B-Bone křivka a Stick. Výstup: out/win/bone_bbone_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bone_bbone_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node bone_bbone_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/bone_bbone_result.txt"
cp "$W"/out/bone_bbone_*.png "$ROOT/out/win/" 2>/dev/null
