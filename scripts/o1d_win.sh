#!/bin/bash
# O1d: aktualizace za běhu bez klikání. Verze A: Blender běží, změněná scéna, přehrávání → server dostane verzi B →
# během přehrávání se nic nestane, po zastavení (klid 2 s) autosave + reload sám → po startu obnovená scéna + lišta „Aktualizováno“.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
[ "${SKIP_BUILD:-0}" = 1 ] || bash "$ROOT/scripts/package_pages.sh" >/dev/null || exit 1
cp "$ROOT/scripts/pwa_update_test.mjs" "$W/"; rm -rf "$W/o1d_profile"
node "$ROOT/scripts/pages_server.mjs" "$ROOT/out/pages" 4176 /blender-wasm/ >/tmp/pages_srv3.log 2>&1 &
SRV=$!; sleep 2; URL=http://localhost:4176/blender-wasm/
run() { ( cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& set WANT_V=$2&& node pwa_update_test.mjs $1 $URL o1d_profile" 2>&1 | stdbuf -oL tr -d "\r" | { [ "$3" = stream ] && grep --line-buffered -v "HAS_MONKEY False" || tail -${3:-6}; } ); }
OLDV=$(cat "$ROOT/out/pages/version.json")
run first 0 | tee /tmp/o1d1.txt
NEWV=$(( $(date +%s) * 1000 ))
# run2 v jedné kartě: verze se změní hned, jak test vypíše O1D_READY (Blender běží, scéna změněná, přehrává se)
: > /tmp/o1d2.txt
( for i in $(seq 1 300); do grep -q O1D_READY /tmp/o1d2.txt && break; sleep 1; done; echo "{\"v\":$NEWV}" > "$ROOT/out/pages/version.json"; echo "  [server: version.json → $NEWV]" ) &
run run2 $NEWV stream | tee /tmp/o1d2.txt
kill $SRV; echo "$OLDV" > "$ROOT/out/pages/version.json"
grep -q "^PASS first" /tmp/o1d1.txt && grep -q "^PASS run2" /tmp/o1d2.txt && echo "PASS o1d" || echo "FAIL o1d"
