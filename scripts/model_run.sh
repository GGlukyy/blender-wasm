#!/bin/bash
# model_run.sh <tag> ["python"] — spustí model_test.mjs ve Windows Chrome; MODEL_VIEW/MODEL_CULL/MODEL_ZOOM z prostředí.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/model_test.mjs" "$W/"; mkdir -p "$W/out"
taskkill.exe /F /IM node.exe >/dev/null 2>&1; taskkill.exe /F /IM chrome.exe >/dev/null 2>&1
printf '%s' "$2" | sed 's/^/    /;s/\r//' > "$W/model_py.txt"
cd "$W" && (timeout 280 cmd.exe /c "set MODEL_TAG=$1&& set MODEL_VIEW=${MODEL_VIEW:-BACK}&& set MODEL_CULL=${MODEL_CULL:-0}&& set MODEL_ZOOM=${MODEL_ZOOM:-0.45}&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node model_test.mjs > m_$1.txt 2>&1"; true)
tr -d '\r' < "$W/m_$1.txt" | grep -E "BM_TOTAL|MODEL|ERR|PAGEERR"; cp "$W"/out/model_*$1.png "$ROOT/out/win/" 2>/dev/null; ls "$ROOT/out/win"/model_*$1.png
