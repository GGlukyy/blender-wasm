#!/bin/bash
# R0: release balíček pro itch.io → out/itch_<datum>.zip. Nic nenahrává; zip nahraje Lukáš ručně.
# Bez Puter analytiky/brandingu (demo/vite.config.js, RELEASE=1), telemetrie vypnutá. Obsahuje demo/public (blender.wasm.zst, assets).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/out/itch_$(date +%Y-%m-%d_%H%M).zip"
cd "$ROOT/demo"
rm -rf dist
RELEASE=1 pnpm build
# kontrola: v releasu nesmí zůstat Puter analytika / branding
if grep -rEil "plausible|developer\.puter\.com|Brought to you by" dist/index.html dist/assets/*.js 2>/dev/null | grep -q .; then
  echo "CHYBA: v dist zůstala Puter analytika/branding:"; grep -rEil "plausible|developer\.puter\.com|Brought to you by" dist/index.html dist/assets/*.js; exit 1
fi
( cd dist && zip -qr "$OUT" . )
echo "OK $OUT"; ls -la "$OUT"
find dist -type f -size +45M -print | sed 's/^/POZOR soubor > 45 MB: /'
