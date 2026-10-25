#!/bin/bash
# H7: ochrana Material Preview (iPad). Tři běhy: ?ipad=1 → SOLID+pruh; ?ipad=1&mp=1 → MATERIAL; bez parametru (PC) → MATERIAL.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/mpguard_test.mjs" "$W/"; mkdir -p "$W/out"
run() { # query expect tag
  taskkill.exe /F /IM node.exe >/dev/null 2>&1
  cd "$W" && cmd.exe /c "set MPEXPECT=$2&& set MPTAG=$3&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mpguard_test.mjs \"$1\"" 2>&1 | tr -d '\r' | grep -E "MPGUARD|PASS|FAIL|PAGEERROR"
}
run '?ipad=1' 1 ipad
run '?ipad=1&mp=1' 0 optout
run '' 0 pc
mkdir -p "$ROOT/out/win"; cp "$W"/out/mpguard_*.png "$ROOT/out/win/" 2>/dev/null
