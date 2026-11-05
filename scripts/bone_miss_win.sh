#!/bin/bash
# H25d: vygenerovaný Rigify rig, klik na tvar / osu / vedle. Výstup: out/win/bone_miss_result.txt
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bone_miss_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set MESH=$MESH&& node bone_miss_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/bone_miss_result.txt"
cp "$W/out/bone_miss.png" "$ROOT/out/win/" 2>/dev/null
