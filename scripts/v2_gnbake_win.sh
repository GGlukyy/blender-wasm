#!/bin/bash
# F5: Geometry Nodes simulation zone bake na disk = desktop 5.3.0. Q="…" volitelně.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_gnbake_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_gnbake_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_gnbake_result.txt"
R="$ROOT/out/win/v2_gnbake_result.txt"; grep -a "^OPS v2gnb" "$R" | sort > /tmp/v2gnb_web.txt; grep -a "^OPS v2gnb" "$ROOT/scripts/v2_gnbake_desk.txt" | sort > /tmp/v2gnb_d.txt
if grep -q OPS_DONE "$R" && [ -s /tmp/v2gnb_d.txt ] && diff /tmp/v2gnb_d.txt /tmp/v2gnb_web.txt; then echo "PASS v2_gnbake (= desktop)"; else echo "FAIL v2_gnbake"; fi
