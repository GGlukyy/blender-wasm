#!/bin/bash
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
sed "s/^SEED = 7; N = 400/SEED = ${FUZZ_SEED:-7}; N = ${FUZZ_N:-400}/" "$ROOT/scripts/leak_test.py" > "$W/leak_test.py"; cp "$ROOT/scripts/soak_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_ALL=0&& set SOAK_SECS=$SOAK_SECS&& set OPS_PY=leak_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node soak_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/model_ops_result.txt"
