#!/bin/bash
# bigmesh_run.sh SEG RING MATS MODE(rand|band) — bigmesh_test.mjs s parametry
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/bigmesh_test.mjs" "$W/"; mkdir -p "$W/out"; taskkill.exe /F /IM chrome.exe >/dev/null 2>&1
cd "$W" && cmd.exe /c "set BM_SEG=$1&& set BM_RING=$2&& set BM_MATS=$3&& set BM_MODE=$4&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node bigmesh_test.mjs" 2>&1 | tr -d '\r' | tail -5
cp "$W"/out/bigmesh_*.png "$ROOT/out/win/" 2>/dev/null
