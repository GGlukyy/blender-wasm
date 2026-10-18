#!/bin/bash
# Replay UI fuzzu (viz ui_replay_test.mjs). FUZZ_SEED, FUZZ_N, FUZZ_KEEP přes WSLENV.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/ui_replay_test.mjs" "$W/"
export WSLENV=FUZZ_SEED:FUZZ_N:FUZZ_KEEP
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ui_replay_test.mjs" 2>&1 | tr -d '\r' | grep RESULT
