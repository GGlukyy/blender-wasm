#!/bin/bash
# H25 rig (Windows Chrome). Vyžaduje běžící vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/rig_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=1&& set OPS_SHOT=out/rig.png&& set OPS_PY=rig_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -E "OPS|BL_PKG|rror|Errno|extension" 
cp "$W"/out/rig.png "$ROOT/out/win/" 2>/dev/null
