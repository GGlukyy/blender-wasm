#!/bin/bash
# O1b: GitHub-Pages simulace: out/pages (scripts/package_pages.sh) servíruje server BEZ COOP/COEP pod /blender-wasm/ ; 1. návštěva se sama izoluje (SW + reload),
# Blender naběhne, pak server vypnut a 2. start OFFLINE. Chrome (Playwright) — sim varianta: SIM=1 přidá ?webkit_sim=1.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
[ "${SKIP_BUILD:-0}" = 1 ] || bash "$ROOT/scripts/package_pages.sh" || exit 1
cp "$ROOT/scripts/pwa_offline_test.mjs" "$W/"; mkdir -p "$W/out"; rm -rf "$W/pages_profile"
node "$ROOT/scripts/pages_server.mjs" "$ROOT/out/pages" 4174 /blender-wasm/ >/tmp/pages_srv.log 2>&1 &
SRV=$!; sleep 2
URL=http://localhost:4174/blender-wasm/
run() { ( cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set SELF_RELOAD=1&& node pwa_offline_test.mjs $1 $URL pages_profile" 2>&1 | tr -d '\r' | tail -7 ); }
run online | tee /tmp/pages1.txt
kill $SRV; sleep 2; curl -s -m 3 -o /dev/null $URL && echo "WARN server still up"
run offline | tee /tmp/pages2.txt
cp "$W"/out/pwa_*.png "$ROOT/out/win/" 2>/dev/null
grep -q "^PASS online" /tmp/pages1.txt && grep -q "^PASS offline" /tmp/pages2.txt
