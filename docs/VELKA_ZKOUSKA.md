# Velká zkouška (víkend od so 7. 11.) — systematicky, ne po jednom bugu

Proč: na Macu jsme za hodinu našli 2 velké chyby (MP/Rendered = limity WebGPU, Grease Pencil = dual-source), které PC testy
nikdy neviděly. Regrese má 59 sekcí a 0 FAIL, ale **testuje jen Chrome na PC**. Mezera není v počtu testů, ale v ENGINU (Safari/WebKit)
a v tom, že na iPadu/Macu nikdo neprojde všechno najednou.

## Část A — "Safari na PC" (smyčka sama, hlavní páka)
- [ ] A1 Režim `?webkit_sim=1` v Chrome, který napodobí omezení Safari: requestDevice JEN s výchozími limity WebGPU (8 SSBO na stage,
  ...InFragmentStage/InVertexStage = 8, maxBindGroups 4…), BEZ featury `dual-source-blending`, storage textury jen tier1 (r32*),
  `override` zakázané (vynutit náš ovrPatch), stejné cesty jako `_isIpadUA`/WebKit (S1b). Ověřit, že S1 chybu (MP nekreslí) a GP
  chybu (tahy chybí) tento režim ZREPRODUKUJE na starém buildu -> pak je režim užitečný.
- [ ] A2 Celý `regress_all.sh` ještě jednou s `webkit_sim=1` (+ `ipad=1` varianta). Každá nová chyba = položka v BACKLOGu (důkaz + 3b).
- [ ] A3 Pravidlo do budoucna: každá změna se testuje v obou režimech (Chrome i webkit_sim).

## Část B — "Prohlídka" jedním odkazem (Lukáš: iPad, školní Mac přes tunel, ~5 min bez klikání)
- [ ] B1 Scénář `?auto=tour&tel=1`: projde VŠECHNY workspace (Layout…Scripting), v každém Solid -> Material Preview -> Rendered ->
  Wireframe, Edit mode (extrude, loop cut, undo/redo vč. Cmd), Sculpt (tah), Texture Paint (tah), 2D Animation (tah tužkou),
  Geometry Nodes (přidat modifier), Rigify (generate + klik na kost + box), File Save -> reopen, Export glTF. Každý krok
  `auto_step <název>`, po každém kroku screenshot do telemetrie (malý, 256 px) + všechny gpuerr/abort/PIPE_INVALID s názvem kroku.
- [ ] B2 `scripts/tour_report.py <soubor>`: tabulka krok × zařízení: OK / chyba (první řádek chyby) / chybí obraz (prázdný screenshot).
- [ ] B3 Lukáš spustí na iPadu a na školním Macu (přes tunel z domácího PC, ten musí běžet) — jedna prohlídka = kompletní seznam
  chyb pro daný prohlížeč. Opakovat po každé větší opravě.

## Část C — opravy podle výsledků
- Seřadit nalezené chyby podle dopadu (spadne/nekreslí > špatně kreslí > kosmetika), opravovat od nejhorších, každá s testem v A.
