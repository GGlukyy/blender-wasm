#!/bin/bash
# C1: Cycles CPU F12 (kostka 64 samples 960×540). Vyžaduje dev server s buildem WITH_CYCLES (cd demo && npx vite --config vite.cyc.config.js).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/${CYC_PY:-cycles_test.py}" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=${CYC_PY:-cycles_test.py}&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set OPS_SHOT=out\\cyc_shot.png&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/cycles_result.txt" | grep -a "OPS cycles\|OPS_DONE\|PAGEERR\|Uncaught\|abort" | cut -c1-300
