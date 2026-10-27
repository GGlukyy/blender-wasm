#!/bin/bash
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
python3 -c 'import sys;print(open(sys.argv[1]).read().replace("${process.env.LITE_OFF || \"\"}",sys.argv[2]),end="")' "$ROOT/scripts/mp_lite_test.mjs" "$LITE_OFF" > "$W/mp_lite_test.mjs"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mp_lite_test.mjs" 2>&1 | tr -d '\r' | tail -60
cp "$W"/out/mp_lite*.png "$ROOT/out/win/" 2>/dev/null
