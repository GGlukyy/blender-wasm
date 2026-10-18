#!/bin/bash
# Fuzz náhodných modelovacích operací (bez pádu wasm). Výstup: OPS fuzz PASS / chyba stránky.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
sed "s/^SEED = 7; N = 400/SEED = ${FUZZ_SEED:-7}; N = ${FUZZ_N:-400}/" "$ROOT/scripts/fuzz_obj_test.py" > "$W/fuzz_obj_test.py"; cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=fuzz_obj_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -v "^\[err\]" | tee "$ROOT/out/win/fuzz_obj_result.txt"
