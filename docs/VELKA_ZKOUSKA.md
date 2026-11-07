# Velká zkouška (víkend od so 7. 11.) — systematicky, ne po jednom bugu

Proč: na Macu jsme za hodinu našli 2 velké chyby (MP/Rendered = limity WebGPU, Grease Pencil = dual-source), které PC testy
nikdy neviděly. Regrese má 59 sekcí a 0 FAIL, ale **testuje jen Chrome na PC**. Mezera není v počtu testů, ale v ENGINU (Safari/WebKit)
a v tom, že na iPadu/Macu nikdo neprojde všechno najednou.

## Část A — "Safari na PC" (smyčka sama, hlavní páka)
- [x] (7.11. P48 `simcheck_win.sh`: S1 i GP zreprodukované přepínači `sim_nos1=1` a `nodualsrc=0`, s opravami 0 chyb. Neumí chyby překladu WebKitu, např. `location(115)`) A1 Režim `?webkit_sim=1` v Chrome, který napodobí omezení Safari: requestDevice JEN s výchozími limity WebGPU (8 SSBO na stage,
  ...InFragmentStage/InVertexStage = 8, maxBindGroups 4…), BEZ featury `dual-source-blending`, storage textury jen tier1 (r32*),
  `override` zakázané (vynutit náš ovrPatch), stejné cesty jako `_isIpadUA`/WebKit (S1b). Ověřit, že S1 chybu (MP nekreslí) a GP
  chybu (tahy chybí) tento režim ZREPRODUKUJE na starém buildu -> pak je režim užitečný.
- [ ] A2 Celý `regress_all.sh` ještě jednou s `webkit_sim=1` (+ `ipad=1` varianta). Každá nová chyba = položka v BACKLOGu (důkaz + 3b).
- [x] (7.11. pravidlo v CLAUDE.md 3.3) A3 Pravidlo do budoucna: každá změna se testuje v obou režimech (Chrome i webkit_sim).

## Část B — "Prohlídka" jedním odkazem (Lukáš: iPad, školní Mac přes tunel, ~5 min bez klikání)
- [x] (7.11. P49, `tour_win.sh`: 75 kroků za 274 s, s `tourpart=` jen části. Cmd nejde, main.js překládá jen skutečné klávesy) B1 Scénář `?auto=tour&tel=1`: projde VŠECHNY workspace (Layout…Scripting), v každém Solid -> Material Preview -> Rendered ->
  Wireframe, Edit mode (extrude, loop cut, undo/redo vč. Cmd), Sculpt (tah), Texture Paint (tah), 2D Animation (tah tužkou),
  Geometry Nodes (přidat modifier), Rigify (generate + klik na kost + box), File Save -> reopen, Export glTF. Každý krok
  `auto_step <název>`, po každém kroku screenshot do telemetrie (malý, 256 px) + všechny gpuerr/abort/PIPE_INVALID s názvem kroku.
- [x] (7.11. P49, screenshoty do `out/tour/<relace>/`) B2 `scripts/tour_report.py <soubor>`: tabulka krok × zařízení: OK / chyba (první řádek chyby) / chybí obraz (prázdný screenshot).
- [ ] B3 Lukáš spustí na iPadu a na školním Macu (přes tunel z domácího PC, ten musí běžet) — jedna prohlídka = kompletní seznam
  chyb pro daný prohlížeč. Opakovat po každé větší opravě.

## Část C — opravy podle výsledků
- Seřadit nalezené chyby podle dopadu (spadne/nekreslí > špatně kreslí > kosmetika), opravovat od nejhorších, každá s testem v A.

## Část D — Lov chyb přes noc "jako cizí uživatel" (stálý režim smyčky, když není jiná práce)
Cíl (Lukáš 5. 11.): smyčka sama najde chyby, na které narazí BĚŽNÝ uživatel Blenderu a které Lukáš zatím nenašel.
Ne fuzz (náhodné klikání = výplň). Místo toho **reálné postupy přes UI + srovnání s desktop Blenderem** (stejná verze na Lukášově PC).

Postup jedné "cesty" (journey):
1. Napsat cestu jako Playwright scénář se SKUTEČNÝMI vstupy (myš, klávesy vč. Cmd/QWERTZ, dotyk kde dává smysl), ne jen bpy.
2. Pustit ji: Chrome normálně, Chrome `webkit_sim=1` (část A), a stejné kroky v desktop Blenderu (bpy/operátory přes Blender MCP nebo `--python`).
3. Porovnat výsledek: data scény (počty objektů/vrcholů/materiálů/kostí, vybrané/aktivní objekty, módy), screenshot viewportu (parity), konzole (gpuerr/abort/PAGEERROR = vždy chyba), čas kroku (> 5× desktop = výkonový problém).
4. Rozdíl = chyba -> BACKLOG s důkazem (scénář + screenshot web vs desktop) a pravidlem 3b. Opravit, co je jasné; jinak zapsat.

Knihovna cest (postupně doplňovat, každá 2–5 min):
- donut tutoriál začátek (torus, subdiv, proportional edit, sculpt, materiál, MP)
- židle/stůl z kostky (extrude, inset, bevel, loop cut, mirror modifier, apply)
- UV unwrap + obrázková textura (Image ▸ Open, Texture Paint tah, uložit obrázek)
- materiál přes Shading workspace (nody, Principled, připojit texturu)
- sculpt (dyntopo/remesh, maska, symetrie, undo)
- rig: armatura, parent with automatic weights, pose, klik/box na kosti, weight paint
- animace: klíčové snímky, timeline, graph editor, přehrát
- 2D Animation: kreslení, vrstvy, gumování, barvy
- Geometry Nodes: scatter na plochu, instance, realize
- soubory: Save/Open/Recent, Import/Export glTF/FBX/OBJ/STL, Append z jiného .blend
- add-ony: zapnout vestavěné, Install from Disk, Get Extensions offline chování
- UI: změna workspace, rozdělení oblastí, Preferences (téma, jednotky, klávesy), N-panel, vyhledávání F3, kontextová menu
- vstup: Cmd vs Ctrl, QWERTZ/AZERTY, numpad emulace, pero/dotyk (touch_win)
Výstup každé noci do STATUS: tabulka cesta × (Chrome / webkit_sim) = OK / chyba (odkaz na BACKLOG) / rozdíl proti desktopu.
