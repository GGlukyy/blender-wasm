#!/bin/bash
# B3j: ./b3j_win.sh "<query>" "<js-flags>" [sekundy] — rozpad paměti renderer procesu Chrome po startu (MEM řádek).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/b3j_mem_test.mjs" "$W/"; mkdir -p "$W/out" "$ROOT/out/win"
printf 'set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\r\nset PW=playwright-core\r\nset "B3J_Q=%s"\r\nset "B3J_JSF=%s"\r\nnode b3j_mem_test.mjs %s\r\n' "$1" "$2" "${3:-30}" > "$W/b3j_run.cmd"
cd "$W" && cmd.exe /c b3j_run.cmd 2>&1 | tr -d '\r' | tee -a "$ROOT/out/win/b3j.log" | grep -E "^MEM|Error" | tail -5
