# ADR O1b — offline verze mimo itch: GitHub Pages (17. 11. 2026)

**Rozhodnutí:** GitHub Pages, ne Cloudflare Pages. Rozhodl jsem podle čísel (architekta jsem nevolal, rozhodnutí je jednoznačné z limitů).

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| limit souboru | 100 MB (push varuje od 50 MB) | **25 MiB** |
| naše největší soubory | `assets.tar.zst` 42 MB, `blender-pc.wasm.zst` 30 MB, `blender.wasm.zst` 28 MB | vše > 25 MiB → dělit na díly + skládat v JS |
| vlastní hlavičky | ne → řeší `sw.js` (COOP/COEP/CORP) | ano (`_headers`), ale limit souboru je horší |
| celé repo / web | 1 GB doporučeno, web ≤ 1 GB | 20 000 souborů |

**Proč ne Cloudflare:** dělení wasm/assets na díly = nový kód v loaderu (riziko pro iPad) kvůli limitu, který GitHub nemá.

**Jak to funguje**
- `scripts/package_pages.sh` → `out/pages/` (vite build s `RELEASE=1 PAGES=1`: bez Puter analytiky, service worker zapnutý, relativní cesty `./`, takže jde i pod `/<repo>/`).
- První návštěva: stránka není `crossOriginIsolated` (Pages neposílá hlavičky) → zaregistruje se `sw.js`, ten převezme stránku a ta se **sama jednou znovu načte** (pak je izolovaná, vlákna fungují). Další návštěvy: izolovaná hned (SW).
- Offline: `sw.js` cachuje všechny soubory (Cache Storage). Aktualizace: `version.json` → pruh „Je nová verze“.
- Publikace: `scripts/publish_pages.sh <git-url>` pošle `out/pages` jako **jeden commit** do větve `gh-pages` (force; historie se nehromadí, jinak by každý wasm 30 MB nafukoval repo).
- Test: `scripts/pages_win.sh` — server bez COOP/COEP pod `/blender-wasm/`, Chrome: 1. start (samo-izolace + Blender naběhne), server vypnut, 2. start offline.

**Rizika:** GitHub soft limit 100 GB/měsíc provozu; `sw.js` musí být ze stejného původu (je). Safari: SW funguje jen na HTTPS (Pages ano). iPad „Přidat na plochu“ → vlastní úložiště, nezávisí na itch.
