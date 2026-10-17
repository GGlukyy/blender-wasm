#!/bin/bash
# Rotate a Scale gizmo prstem (Windows Chrome). Vyžaduje běžící vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/gizmo_rs_test.mjs" "$W/"; mkdir -p "$W/out"
for cfg in "rotate 213" "scale 248"; do set -- $cfg
  cd "$W" && cmd.exe /c "set KIND=$1&& set TOOLY=$2&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node gizmo_rs_test.mjs" 2>&1 | tr -d '\r' | tail -4
done
mkdir -p "$ROOT/out/win"; cp "$W"/out/gizmo_rotate.png "$W"/out/gizmo_scale.png "$ROOT/out/win/" 2>/dev/null
