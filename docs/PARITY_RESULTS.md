# Parity test — web build (automaticky, Windows Chrome, 16. 10. 2026)

Spuštění: `scripts/parity_win.sh` (vite dev na :5173). Screenshoty: `out/parity/` (lokálně, není v gitu). Desktop Blender na tomhle PC není, proto detektory kontrolují očekávaný výsledek (barvy/rozdíl snímků/logy), ne přímé porovnání s desktopem. ❓ = nelze rozhodnout automaticky.

| # | Test | Výsledek | Detail | Čas |
|---|---|---|---|---|
| 3 | 3D kurzor je vidět | ✅ | červené 31, bílé 18 px u počátku | 19 s |
| 4 | Cursor tool: kurzor NA povrch (depth snapshot) | ✅ | hloubka ze snapshotu | 21 s |
| 5 | Výběr objektu: oranžový obrys | ✅ | oranžové pixely 599 | 19 s |
| 6 | Move gizmo je vidět | ✅ | R210 G167 B170 | 19 s |
| 7 | Wireframe / Material Preview / Rendered | ✅ | wire: změna 2.4 %; material: změna 2.1 %; rendered: změna 2.0 % | 33 s |
| 8 | Přepnutí workspace Layout → Shading → Modeling | ✅ | 20 s celkem | 37 s |
| 9 | Edit mode: vrcholy (tečky) jsou vidět | ✅ | 8 bodů jako quady | 20 s |
| 10-11 | Výběr plochy v Solid módu (klik) | ✅ | změna 0.87 % viewportu (17. 10. po opravě kliku na plochu; výběr = plocha pod kurzorem) | 19 s |
| 12 | A (vybrat vše) / Alt+A (zrušit) | ✅ | vybrat vše: 1.61 %, zpět: 0.00 % | 24 s |
| 13 | Extrude (E) na vybrané ploše | ❓ | proběhlo bez chyby (tvar posoudit ručně ze screenshotu) | 22 s |
| 17 | Přidání UV Sphere (F3 hledání) | ✅ | změna 0.63 % | 25 s |
| 18 | Subdivision Surface (Ctrl+2) | ✅ | změna tvaru 1.88 % | 25 s |
| 19a | Modifikátor Array | ✅ | změna 3.65 % | 24 s |
| 19b | Modifikátor Bevel | ✅ | změna 0.41 % | 24 s |
| 19c | Modifikátor Mirror | ❓ | změna 0.02 % (beze změny — u výchozí kostky v počátku to může být správně) | 24 s |
| 19d | Modifikátor Solidify | ❓ | změna 0.02 % (beze změny — u výchozí kostky v počátku to může být správně) | 24 s |
| 20 | Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) | ✅ | po undo 0.00 % od originálu, po redo 0.38 % od subsurfu | 29 s |

## Mimo automatický test (zatím jen ručně → TEST_CHECKLIST.md)
14 Ctrl+R, 15 bevel/inset/knife, 16 delete/merge, 21 UV, 22 materiál, 23–25 soubory/import/export, 26–27 výkon.

## Nálezy z logu
- Add-on `bl_pkg` (Extensions) se nezaregistruje: `ModuleNotFoundError: No module named '_multiprocessing'` (CPython pro wasm je bez toho modulu). Dopad: nejspíš nefunguje Get Extensions; ostatní věci běží. Nízká priorita.
