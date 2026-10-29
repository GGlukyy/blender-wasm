#!/bin/bash
# Spustí scripts/parity_test.mjs ve Windows Chrome (skutečná GPU). Použití: scripts/parity_win.sh [id,id,...]
# Vyžaduje vite dev server na :5173 (cd demo && pnpm dev --host). Výstup: out/parity/ (report.md + screenshoty).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/parity_test.mjs" "$W/"; mkdir -p "$W/out"; rm -rf "$W/out/parity"
cd "$W" && cmd.exe /c "set PARITY_DL=$PARITY_DL&& set PARITY_ND=$PARITY_ND&& set PARITY_NDU=$PARITY_NDU&& set PARITY_BP=$PARITY_BP&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node parity_test.mjs $*" 2>&1 | tr -d '\r'
rm -rf "$ROOT/out/parity"; cp -r "$W/out/parity" "$ROOT/out/parity" 2>/dev/null; echo "→ $ROOT/out/parity/report.md"
