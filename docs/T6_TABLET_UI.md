# T6b — oficiální tablet UI Blenderu: co z toho vzít do touch.js

Zdroj: *2025-08-18 iPad/Tablet Design Workshop* (zápis Dalai Felinto, 28. 8. 2025) — https://forum.blender.org/t/42014 (JSON: `/t/42014.json`, stažené z PC; obrázky v `docs/t6/`).
Stav: **jen přehled, nic neimplementováno** (čeká na Lukáše). Odhady jsou označené „odhad".

## 1. Co workshop řešil (zkráceně)
- Dvě cesty: **iPad Pro** (drobné úpravy UI pro klávesnici/myš + dotyk) a **iPad Mini na výšku bez klávesnice** (nové dotykové UI). Cílem je umět přepínat mezi režimy i vstupy (dotyk = navigace, Pencil = kreslení/sochání, klávesnice = zkratky).
- Plán: 1. TestFlight → 2. iPad jako laptop → 3. Pencil + dotyk → 4. nativní integrace → 5. iPad Mini. Android až 2026. (Podle BACKLOG T6 je iPad projekt od ledna 2026 „on hold".)
- Pracovní prostory pro tablet: **Sculpting** = jen viewport, sidebar sbalený (zůstanou záložky), skrýt navigační gizmo (ponechat kameru/perspektivu); **Shading** = jen viewport + node editor, Properties/Outliner předsbalené; **2D Animation** = bez Timeline, sidebar jako „pilulka", zamknutá rotace.
- Společné: Properties/Outliner do „Editor Docku", pryč navigační gizmo, pryč timeline, jednodušší editory.

## 2. Nápady vhodné pro nás (seřazeno podle užitku pro modelování malých assetů)
| # | Nápad (workshop) | Co to je | Máme dnes? | Jak převzít do touch.js / demo | Odhad práce |
|---|---|---|---|---|---|
| 1 | **Gesta: tři prsty tažení = Undo/Redo** (mockup 2. Gestures, `docs/t6/img06.jpg`) | 3 prsty doleva = Undo, doprava = Redo; brání omylem kliknout Undo při zoomu | Máme jen tlačítka Undo/Redo v liště kláves | Detekce 3 pointerů v touch.js → syntetické Ctrl+Z / Ctrl+Shift+Z | malý (odhad 0,5 den) |
| 2 | **Přidržení + tažení z navigačního gizma** („Navigation operators at any time", `img08.jpg`) | Pohybové operátory (orbit/pan/zoom) vždy po ruce u gizma | Máme 1 prst = orbit, 2 prsty = pan/zoom | Spíš nic — naše gesta už pokrývají navigaci | — |
| 3 | **Sticky tools / „Hold" pro výběr** (`img08.jpg`: Selection Tool, rychlé přepínání Box/Circle/Lasso podržením) | Rychlé přepnutí nástroje držením prstu na liště nástrojů | Ne | Nápad pro vlastní lištu: dlouhý stisk ikony nástroje = dočasný nástroj (jako Alt+Tab-hold). Vyžaduje práci s UI Blenderu (Python) | střední (odhad 2 dny) |
| 4 | **Osy X/Y/Z se ukážou jen během operace** (`img08.jpg`, Constraining Axes) | Při G/R/S se u prstu objeví tlačítka X Y Z | Máme X/Y/Z stále v liště kláves | Skrýt X/Y/Z, ukázat je jen při aktivní modal operaci (stav z Pythonu `wm.operators`/`window.modal_operators`) | malý–střední (odhad 1 den) |
| 5 | **Klikací stavový řádek** (status bar) — větší výška, klikatelné zkratky, zvýrazněné Confirm/Cancel u modálních operací | Na tabletu nejsou zkratky, status bar je ukazuje, ale nejde na ně kliknout | Máme lištu kláves (Enter/Esc) | Hotové napůl: tlačítka Enter/Esc existují; Confirm/Cancel zvýraznit jen při modal operaci | malý (odhad 0,5 den) |
| 6 | **Edge swipe** (`img06.jpg`) — tah z okraje vrací UI: ↑ Asset Shelf, ↓ Header, ← Editor Dock, → Toolbar. V Blender větvi `ios` už hotové. | Čisté UI, prvky se vrací tahem | Ne (a Safari používá levý okraj pro „Zpět" — H41!) | Pozor na konflikt s gestem Zpět na iPadu; použít okraje shora/zdola/vpravo. Nutné řešit, jak ukrýt/ukázat oblast: Python `region.hide_*`/`screen.region_toggle` | střední (odhad 2 dny) |
| 7 | **Kontextové menu rychleji než dlouhý stisk** (`img06.jpg`, Context) — dva prsty „klik" nebo jiné gesto | Dlouhý stisk 0,5 s je pomalý | 1 prst 0,5 s = pravé tlačítko | Přidat „tap dvěma prsty = pravé tlačítko" (ve většině 3D aplikací) | malý (odhad 0,5 den) — **pozor**, 2 prsty už znamenají pan/zoom; tap (bez pohybu < 250 ms) je rozlišitelný |
| 8 | **Widgety: vždy zobrazit šipky < > u číselných polí**, bez akcelerátorů v menu když není klávesnice | Dotyk nemá hover | Ne | Změna v C++/UI (Preferences/theme) — nebo Python `bpy.app`? Zatím ne; čistě v Blenderu | střední–velký (C++) |
| 9 | **Defaulty pro tablet:** File browser v režimu „Preview", dočasná okna maximalizovaná, UI měřítko 2,0× @144 dpi (Pro) / 1,8× (Mini) | Měřítko UI pro dotyk | Máme vlastní UI scale/DPI podle zařízení (zkontrolovat v main.js) | Ověřit hodnoty: naše výchozí vs. 2,0× — porovnat na iPadu Lukáš | malý (odhad) |
| 10 | **Navigační gizmo:** oddělit Zoom/Pan/Camera/Perspective (nové: Lock Rotation, Frame Selected, Zoom All), na tabletu skrýt Zoom a Pan | Gizmo méně zabírá místo | Gizmo je celé | Preference viewportu (Viewport Gizmos): na iPadu vypnout `show_gizmo_navigate` části → Python při startu (`space.show_gizmo_navigate`; podrobnosti kontrolovat) | malý (odhad 0,5 den) |
| 11 | **Workspace „Lite" a přepínání bez ztráty pohledu** (sync viewportu) | Lehké workspaces | Máme výběr workspace; paměť po přepnutí řešíme | nic nového | — |

Poznámky z diskuse (komentáře): nick­berckley upozorňuje, že **gizma jsou slabá** (chybí duplikace, 3D kurzor, loop cut vyžaduje hover) → pro dotyk je nutné mít většinu práce přímo ve viewportu; William Reynish: „akce lze spustit odkudkoliv na obrazovce", což je u dotyku výhoda (netrefíš malé cíle).

## 3. Co z toho doporučuju jako první (malé, jen JS/Python, bez rebuildu)
1. Tap dvěma prsty = pravé tlačítko (rychlé kontextové menu) — č. 7.
2. Tři prsty doleva/doprava = Undo/Redo — č. 1.
3. Osy X/Y/Z jen při modal operaci, zvýraznit Enter/Esc — č. 4 a 5.
4. Skrýt Zoom/Pan části navigačního gizma na iPadu — č. 10.
Neimplementováno, čeká na schválení Lukášem (a až tam, kde to na iPadu zkusí).

## 4. Video (https://www.youtube.com/watch?v=IzoFMZBQNB4)
TODO — titulky ze serveru YouTube vrací HTTP 429 (zkoušeno 26. 11. 22:10 z PC přes yt-dlp). Zkusím znovu později.
