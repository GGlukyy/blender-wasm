#!/bin/bash
# O1b: nahraje out/pages do repa jako větev gh-pages (jeden commit, historie se nehromadí). SPOUŠTÍ LUKÁŠ (nebo já po jeho souhlasu) — nic jiného nikam neposílá.
# Použití: scripts/publish_pages.sh git@github.com:GGlukyy/<repo>.git   (repo musí existovat; Settings → Pages → Branch gh-pages / root)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); REPO=${1:?zadej URL repa}
[ -f "$ROOT/out/pages/index.html" ] || { echo "nejdřív scripts/package_pages.sh"; exit 1; }
T=$(mktemp -d); cp -a "$ROOT/out/pages/." "$T/"; cd "$T"
git init -q -b gh-pages; git add -A; git -c user.name="${GIT_AUTHOR_NAME:-GGlukyy}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@users.noreply.github.com}" commit -qm "pages $(date +%F_%H%M)"
git push -f "$REPO" gh-pages
echo "Hotovo. Settings → Pages → Deploy from branch → gh-pages / (root). Adresa: https://<uživatel>.github.io/<repo>/"
