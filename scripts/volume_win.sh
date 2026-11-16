#!/bin/bash
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
# H44: Principled Volume na kostce, MODE=MATERIAL|RENDERED (výchozí MATERIAL); Q=webkit_sim=1&ipad=1 atd. Screenshot out/win/vol_<MODE><suffix>.png
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); M=${MODE:-MATERIAL}
sed "s/%MODE%/$M/g" "$ROOT/scripts/${TPL:-volume_test.py.in}" > "$W/volume_test.py"
cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=volume_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set OPS_SHOT=out\\vol_$M$SUFFIX.png&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -a "OPS volume\|OPS_DONE\|PAGEERR\|Uncaught\|abort\|WGPU_ERR\|rror" | cut -c1-250 | head -20
cp "$W/out/vol_$M$SUFFIX.png" "$ROOT/out/win/" 2>/dev/null
