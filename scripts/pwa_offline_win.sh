#!/bin/bash
# O1a/O1c: vite build -> out/pwa_dist, vite preview :4173, 1. návštěva (online), server vypnout, 2. start OFFLINE ze service workeru.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT/demo"
npx vite build --outDir ../out/pwa_dist --emptyOutDir >/dev/null 2>&1 || { echo "FAIL build"; exit 1; }
cp "$ROOT/scripts/pwa_offline_test.mjs" "$W/"; mkdir -p "$W/out"; rm -rf "$W/pwa_profile"
setsid npx vite preview --port 4173 --strictPort --outDir ../out/pwa_dist >/tmp/pwa_preview.log 2>&1 &
sleep 4
run() { ( cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node pwa_offline_test.mjs $1 http://localhost:4173/ pwa_profile" 2>&1 | tr -d '\r' | tail -6 ); }
run online | tee /tmp/pwa1.txt
pkill -f "vite.js preview --port 4173"; pkill -f "vite preview --port 4173"; sleep 2
curl -s -m 3 -o /dev/null http://localhost:4173/ && echo "WARN server still up"
run offline | tee /tmp/pwa2.txt
cp "$W"/out/pwa_*.png "$ROOT/out/win/" 2>/dev/null
grep -q "^PASS online" /tmp/pwa1.txt && grep -q "^PASS offline" /tmp/pwa2.txt
