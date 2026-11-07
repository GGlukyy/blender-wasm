#!/bin/bash
# T1: jednou nastaví p2win: node.cmd (cmd.exe ho najde dřív než node.exe v PATH, ale jen v p2win) + pw_preload.mjs.
# Druhý monitor: echo 2560,174 > /mnt/c/Users/<ty>/p2win/pw_win_pos.txt   Staré chování: echo off > ...   Zrušit úplně: smaž p2win/node.cmd
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
NODE=$(cd "$W" && cmd.exe /c "where node.exe" 2>/dev/null | tr -d '\r' | head -1)
[ -n "$NODE" ] || { echo "node.exe na Windows nenalezen"; exit 1; }
cp "$ROOT/scripts/pw_preload.mjs" "$W/"
printf '@"%s" --import=file:///C:/Users/%s/p2win/pw_preload.mjs %%*\r\n' "$NODE" "$U" > "$W/node.cmd"
echo "OK $W/node.cmd -> $NODE"
