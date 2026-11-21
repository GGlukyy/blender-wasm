#!/bin/bash
# O1b: nahraje out/pages do repa jako větev gh-pages (jeden commit, historie se nehromadí). SPOUŠTÍ LUKÁŠ (nebo já po jeho souhlasu) — nic jiného nikam neposílá.
# Použití: scripts/publish_pages.sh git@github.com:GGlukyy/<repo>.git   (repo musí existovat; Settings → Pages → Branch gh-pages / root)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); REPO=${1:?zadej URL repa}
# Vždy nejdřív zabalit aktuální demo/public (21. 11.: publish bez package nahrál starý build ze 17. 11.). SKIP_PACKAGE=1 = nahrát existující out/pages.
[ "${SKIP_PACKAGE:-0}" = 1 ] || bash "$ROOT/scripts/package_pages.sh"
[ -f "$ROOT/out/pages/index.html" ] || { echo "nejdřív scripts/package_pages.sh"; exit 1; }
echo "Nahrávám: $(cat "$ROOT/out/pages/version.json" 2>/dev/null); blender.wasm.zst $(stat -c %s "$ROOT/out/pages/blender.wasm.zst") B"
T=$(mktemp -d); cp -a "$ROOT/out/pages/." "$T/"; cd "$T"
git init -q -b gh-pages; git add -A; git -c user.name="${GIT_AUTHOR_NAME:-GGlukyy}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@users.noreply.github.com}" commit -qm "pages $(date +%F_%H%M)"
git push -f "$REPO" gh-pages
echo "Hotovo. Settings → Pages → Deploy from branch → gh-pages / (root). Adresa: https://<uživatel>.github.io/<repo>/"
