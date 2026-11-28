#!/bin/bash
# F4: Mantaflow bake kapalina + kouř (12 snímků) = desktop 5.3.0 (bez času). Q="…" volitelně.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_fluid_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_fluid_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_fluid_result.txt"
R="$ROOT/out/win/v2_fluid_result.txt"; grep -a "^OPS v2fl [A-Z]" "$R" | sort > /tmp/v2fl_web.txt; grep -a "^OPS v2fl [A-Z]" "$ROOT/scripts/v2_fluid_desk.txt" | sort > /tmp/v2fl_d.txt
grep -a "^OPS v2fl_time" "$R" | sed 's/^/web /'; grep -a "^OPS v2fl_time" "$ROOT/scripts/v2_fluid_desk.txt" | sed 's/^/desktop /'
if grep -q OPS_DONE "$R" && [ -s /tmp/v2fl_d.txt ] && diff /tmp/v2fl_d.txt /tmp/v2fl_web.txt; then echo "PASS v2_fluid (= desktop)"; else echo "FAIL v2_fluid"; fi
