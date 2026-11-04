#!/bin/bash
# H29b: File ▸ Open dialog (složka / jeden soubor), přímé otevření jediného .blend. Potřebuje vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$W/blends" "$W/out"; cp "$ROOT"/scripts/testdata/blend64_*.blend "$W/blends/"; cp "$ROOT/scripts/open_single_test.mjs" "$W/"
rc=0
for m in ${*:-folder1 file folder2}; do
  case $m in folder2) F="blends\\blend64_ref.blend blends\\blend64_collide.blend";; *) F="blends\\blend64_ref.blend";; esac
  ( cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node open_single_test.mjs $m $F" 2>&1 | tr -d '\r' | tail -3 ) | tee /tmp/os_$m.txt
  grep -q "^PASS" /tmp/os_$m.txt || rc=1
done
cp "$W"/out/open_*.png "$ROOT/out/win/" 2>/dev/null; exit $rc
