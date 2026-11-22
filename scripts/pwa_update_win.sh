#!/bin/bash
# O1c: test auto-aktualizace: publikovat verzi A, načíst, změnit version.json na B → další start se sám přepne na B (bez lišty a kliknutí).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
[ "${SKIP_BUILD:-0}" = 1 ] || bash "$ROOT/scripts/package_pages.sh" >/dev/null || exit 1
cp "$ROOT/scripts/pwa_update_test.mjs" "$W/"; rm -rf "$W/upd_profile"
node "$ROOT/scripts/pages_server.mjs" "$ROOT/out/pages" 4175 /blender-wasm/ >/tmp/pages_srv2.log 2>&1 &
SRV=$!; sleep 2; URL=http://localhost:4175/blender-wasm/
run() { ( cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set WANT_V=$2&& node pwa_update_test.mjs $1 $URL upd_profile" 2>&1 | tr -d '\r' | tail -4 ); }
run first 0 | tee /tmp/upd1.txt
NEWV=$(( $(date +%s) * 1000 )); echo "{\"v\":$NEWV}" > "$ROOT/out/pages/version.json"
run second $NEWV | tee /tmp/upd2.txt
kill $SRV
grep -q "^PASS first" /tmp/upd1.txt && grep -q "^PASS second" /tmp/upd2.txt
