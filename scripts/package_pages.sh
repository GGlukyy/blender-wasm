#!/bin/bash
# O1b: složka pro GitHub Pages → out/pages/ (vše uvnitř, žádný soubor > 100 MB; sw.js přidá COOP/COEP a offline cache).
# Bez Puter analytiky (RELEASE=1), service worker zapnutý (PAGES=1). Nic nenahrává — viz scripts/publish_pages.sh.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT/demo"
rm -rf "$ROOT/out/pages"
RELEASE=1 PAGES=1 npx vite build --outDir ../out/pages --emptyOutDir >/dev/null
cd "$ROOT/out/pages"
touch .nojekyll                      # Pages nesmí nic zpracovávat Jekyllem
cp index.html 404.html               # neexistující adresa → aplikace
if grep -rEil "plausible|developer\.puter\.com|Brought to you by" index.html assets/*.js 2>/dev/null | grep -q .; then echo "CHYBA: Puter analytika/branding v buildu"; exit 1; fi
BIG=$(find . -type f -size +95M | head); [ -n "$BIG" ] && { echo "CHYBA: soubor > 95 MB (limit Pages 100 MB): $BIG"; exit 1; }
echo "OK out/pages: $(du -sh . | cut -f1), $(find . -type f | wc -l) souborů; největší:"; find . -type f -printf '%s %p\n' | sort -rn | head -4 | awk '{printf "  %.1f MB %s\n", $1/1048576, $2}'
