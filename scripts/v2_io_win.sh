#!/bin/bash
# V2i: export → import OBJ, FBX, glTF, STL, PLY (počty, UV, materiály, rozměry) = desktop 5.3.0. Q="…" volitelně.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
export Q OPS_ALL OPS_MAXS WSLENV="Q:OPS_ALL:OPS_MAXS${WSLENV:+:$WSLENV}"
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/v2_io_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=v2_io_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/v2_io_result.txt"
# porovnání s desktopem 5.3.0 (scripts/v2_io_desk.txt; vygenerováno blender.exe -b s DESK=1, stejné bajty souborů)
R="$ROOT/out/win/v2_io_result.txt"; grep -a "^OPS v2io [a-z0-9_]* [oE]" "$R" | sed 's/^OPS v2io //' | sort > /tmp/v2io_web.txt
grep -a "^OPS v2io [a-z0-9_]* [oE]" "$ROOT/scripts/v2_io_desk.txt" | sed 's/^OPS v2io //' | sort > /tmp/v2io_d.txt
if grep -q OPS_DONE "$R" && [ -s /tmp/v2io_d.txt ] && diff /tmp/v2io_d.txt /tmp/v2io_web.txt; then echo "PASS v2_io ($(wc -l < /tmp/v2io_web.txt) formátů = desktop)"; else echo "FAIL v2_io (rozdíl proti desktopu výše)"; fi
