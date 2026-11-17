#!/bin/bash
# File ▸ New ▸ šablony (Windows Chrome). Vyžaduje běžící vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/templates_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=templates_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep "tmpl\|DONE\|TIMEOUT" | tee /tmp/tmpl_out.txt
grep -q "OPS_TIMEOUT" /tmp/tmpl_out.txt && { echo "FAIL templates: OPS_TIMEOUT (načtení šablony spadlo, viz BACKLOG H49)"; exit 1; }
grep -q "FAIL" /tmp/tmpl_out.txt && exit 1
exit 0
