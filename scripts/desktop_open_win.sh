#!/bin/bash
# .blend z desktop Blenderu 5.2 → web build (Windows Chrome). Vyžaduje vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/desktop_open_test.mjs" "$ROOT/scripts/testdata/desktop_scene.blend" "$ROOT/scripts/testdata/desktop_scene.json" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node desktop_open_test.mjs" 2>&1 | tr -d '\r' | tail -6
mkdir -p "$ROOT/out/win"; cp "$W"/out/desktop_open.png "$ROOT/out/win/" 2>/dev/null
