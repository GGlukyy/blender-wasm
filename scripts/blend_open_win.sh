#!/bin/bash
# P2b test: scripts/blend_open_win.sh  (výchozí: ref + collide_real (skutečná kolize z desktopu 5.3.0, D1: musí se otevřít správně)
# Pozn.: dřívější syntetický kolizní soubor (2 bajty změněné `old`) je ve skutečnosti poškozený (visící ukazatele) — spadne i desktop 5.3.0 (EXCEPTION_ACCESS_VIOLATION), proto není v testu (scripts/testdata/corrupt_synthetic_collide.blend).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$W/blends"; cp "$ROOT"/scripts/testdata/blend64_*.blend "$W/blends/"; cp "$ROOT/scripts/blend_open_test.mjs" "$W/"
FILES=${*:-"blends\\blend64_ref.blend blends\\blend64_collide_real.blend"}
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node blend_open_test.mjs $FILES" 2>&1 | tr -d '\r' | tail -8
