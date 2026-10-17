Výsledek: 🟡 víkend: opraveno ~10 chyb ověřených na PC (viz níže), regresní sada `regress_all.sh` bez FAIL — vše čeká na test na iPadu

# ⭐ Co otestovat na iPadu NEJDŘÍV (nové z víkendu, podle důležitosti)
(Ověřeno jen na PC/Chrome; na iPadu nic. Pokud něco spadne, napiš přesné kroky + screenshot.)
1. **UV Editing nespadne**: Tab (edit mode) → záložka *UV Editing* nahoře → A → G → táhnout.
2. **Záložka Material nezamrzne**: vpravo vlastnosti objektu → koule dole (Material). Náhledy jsou záměrně šedé koule.
3. **Export do hry**: File ▸ Export ▸ *glTF 2.0 (.glb)* a *FBX* → cesta `/opfs/home/test.glb` → 📁 stáhnout → otevři v Unity/desktop Blenderu.
4. **Uložit obrázek PNG**: F12 render (nebo Image ▸ Save As) → PNG → stáhnout přes 📁.
5. **Sculpt**: dole v pruhu štětců jsou obrázky (ne hodiny). Vertex/Weight/Texture Paint tahem Pencilu.
6. **Grease Pencil**: Shift+A → Grease Pencil → kreslit.
7. První přepnutí do **Material Preview**: objeví se hláška „Kompiluji shadery…“ — kolik sekund trvá?
8. Dále stále platí seznam „Co otestovat na iPadu (podle důležitosti)“ níže (dotyk, soubory, výběr, z-fighting, `?perf=1`).

## Blocked / otevřené (poctivě)
- Z-fighting ploch: nereprodukuje se na PC, aplikovaná hypotéza čeká na iPad.
- Voxel Remesh, Rigid Body, Quadriflow: v buildu chybí (OpenVDB/Bullet/Quadriflow) — hlásí chybu.
- Draco/Meshopt komprese glTF, Extensions (bl_pkg), `_ctypes`/`_ssl`/`_lzma`, `import sqlite3` zavěsí.
- Kompilace pipeline při prvním Material Preview blokuje 6–7 s (jen hláška, ne oprava).

# Víkend — co je nového (17. 10., odpoledne)
- Noc 17. → 18. 10. (21:45): backlog zkontrolován — zbývají jen položky, které potřebují iPad nebo desktop Blender (z-fighting, OpenVDB, drag&drop parent, Info editor řádek). `startup_win.sh` PASS (seed 198 shaderů, okno naběhlo za 5,6 s). Žádná nová chyba, žádná změna kódu.

- Večer 17. 10. (kola 15–21): nové testy přes UI (Shift+D, merge, delete, G/S/R s číslem, výběr/skrytí, proportional editing, Smart UV dialog, barva materiálu v Material Preview/Rendered), `ops_win.sh` 77 testů. **Žádná nová chyba**, `regress_all.sh` bez FAIL.
- Výkon (PC): překreslení 13 ms nezávisí na počtu objektů (200 kostek = 13,2 ms); sculpt tah 685–842 ms od 2 562 do 655 362 vrcholů; save/open .blend 0,03 s. Úzké hrdlo je pevná režie UI, ne scéna.
- **Nové (výkon/paměť):** Material Preview zabíral ~1 GB GPU paměti (hlavně EEVEE Shadow Pool 512 MB). Teď 128 MB (−384 MB) pro startup scénu a nové soubory. **Na iPadu ověř:** Material Preview (koule v liště / Z → Material Preview) nespadne a stíny vypadají dobře; kdyby ne, `?shadowpool=512`.
- Další testy večera (vše PASS na PC): Outliner (klik, Ctrl+klik, přejmenování), Timeline (scrub, klíče, přehrávání), Python Console, Preferences/menu, Shading+Geometry Nodes workspace, Pencil/prst ve Sculptu, Pencil ve Vertex Paint, únik GPU i wasm paměti (žádný). Nepotvrzeno: Outliner drag&drop = parent (viz BACKLOG).
- Nic z toho se na iPadu nezměnilo → seznam „Co otestovat na iPadu NEJDŘÍV“ výše platí beze změny.
- ✅ **Pád v UV Editing workspace** (stránka spadla s „Aborted(Assertion failed)“ hned po přepnutí na UV Editing s objektem v edit modu): GPU buffer vrcholů se mezi přípravou a vykreslením vyměnil a kreslilo se se zrušeným handlem. Opraveno, test `uvedit_win.sh` PASS (G posune UV). **Na iPadu ověřit:** Tab (edit mode) → záložka UV Editing nahoře → vybrat vše (A) → G → táhnout: nespadne? (Mohlo to být i příčinou jiných náhodných pádů.)
- ✅ **Hláška „⏳ Kompiluji shadery…“**: při prvním přepnutí do Material Preview / Rendered se Blender na 6–7 s zasekne (PC; na iPadu asi víc) — prohlížeč kompiluje velké pipeline; teď se v tu chvíli dole zobrazí hláška, ať to nevypadá jako pád. Samotné zasekání zůstává (jednorázově za session). **Na iPadu změřit:** jak dlouho trvá první přepnutí na Material Preview (hláška viditelná?).
- ✅ **Zamrznutí při otevření záložky Material** (a pád/zaseknutí při přidání Grease Pencil): příčina = náhledové ikony materiálů (EEVEE) se na webu kompilují synchronně. Vypnuto (šedá koule místo náhledu; `?iconprev=1` je zapne). PC: UI se už neblokuje, GP kreslí. **Na iPadu ověřit:** vlastnosti objektu → záložka Material (koule vpravo dole) → nezamrzne? Shift+A → Grease Pencil → kreslit Pencilem.
- ✅ Další paint režimy ověřeny na PC: Vertex, Weight, Texture Paint i Grease Pencil (`vpaint/wpaint/tpaint/gpaint_win.sh`).
- ✅ **Export FBX a GLB (glTF) teď funguje** (dřív oba padaly: chybělo numpy). Přidal jsem numpy 2.3.4 staticky do blender.wasm (python soubory 7,3 MB nekomprimovaně; blender.wasm.zst teď 24,3 MB, assets.tar.zst 38,7 MB), opravil add-ony (ctypes, `process_time`). Test na PC: export kostky do GLB i FBX a zpětný import → správné počty (`ops_win.sh`, 63 testů failed=0). Draco/Meshopt komprese glTF na webu není. **Na iPadu ověřit:** File ▸ Export ▸ glTF 2.0 (.glb) a FBX → zadej cestu do `/opfs/home/…` → stáhni přes 📁 → otevři v Unity/desktop Blenderu. Také ověř, že start není znatelně pomalejší (numpy se načítá až při prvním použití).
- ✅ **Ukládání PNG nefungovalo** (Image ▸ Save As, uložení renderu F12 jako PNG, bake, miniatury): „Could not write image“. Příčina v knihovně OpenImageIO (`ustring::string()` vracelo prázdný text u delších názvů metadat). Opraveno (`scripts/build_oiio.sh`), test `ops_win.sh` png_save_roundtrip PASS. **Na iPadu ověřit:** F12 render → Image ▸ Save As → PNG → stáhnout přes 📁. Pozor: `wasm-sysroot/` se přebuildoval; kdo staví od nuly, spustí `scripts/build_oiio.sh`.
- ✅ **Miniatury štětců** v Sculpt režimu (asset shelf dole) se teď zobrazují (dřív věčné „hodiny“; příčina: job na načítání náhledů se na webu spouštěl zbytečně dokola při každém překreslení → i menší zátěž). Důkaz: `out/win/sculpt_after.png`, `scripts/regress_all.sh` bez FAIL. Na iPadu ověřit: Sculpting workspace → dole pruh se štětci má obrázky.
- ✅ **Měření uploadů**: při orbitu 169 zápisů / 205 KB na snímek, žádný velký → mesh buffery se nepřenačítají každý snímek (žádný snadný zisk). `scripts/uploads_win.sh` PASS. `_multiprocessing` = WONTFIX (Extensions stahují přes spawn procesů, v prohlížeči nejde).
- ✅ **Voxel Remesh bez OpenVDB** už nemlčí: operátor i modifikátor hlásí „built without OpenVDB“ (dřív prázdný výsledek). Samotný OpenVDB build je pořád otevřený (těžký). Důkaz: `scripts/ops_win.sh` → voxel_remesh_warns PASS, 36 testů failed=0. BLENDER_REF=9f1d369d.
- ✅ **P4 dotyk a Pencil** (nové, JS `demo/src/touch.js`): Safari posílá myší eventy jen pro tap, ne pro tažení → dřív se na iPadu nedalo orbitovat prstem. Teď: **Ve 3D viewportu: 1 prst = orbit, 2 prsty = pan / pinch zoom. Mimo viewport (panely, outliner, timeline): 1 prst = levé tlačítko (tažení sliderů a polí), 2 prsty = scroll/zoom editoru. Všude: tap = klik, dlouhý stisk = pravé tlačítko, Pencil = levé tlačítko** + **tlak a náklon Pencilu** (sculpt/paint štětce reagují na sílu přítlaku; PC test `scripts/pen_pressure_win.sh`: tlak 0,15 → 4× slabší tah) + plovoucí lišta kláves (Esc, Enter, Tab, A, G, R, S, X, Y, Z, Del, 1/2/3, Home, ↶ ↷, Shift/Ctrl/Alt jako přepínače). Důkaz na PC: `scripts/touch_win.sh` (CDP dotyk + pen) ALL PASS. **Na iPadu neověřeno.**
- ✅ **P1 shader seed**: příčina — Blender běží na pthread workeru a cache z `main.js` tam nebyla vidět (nikdy nefungovala). Teď se seed načítá sync XHR ve workeru. Důkaz: `scripts/wgsl_seed_win.sh verify` → 0 překladů při průchodu 11 workspace (dřív 177). Seed 2,6 MB se stahuje při prvním načtení.
- ✅ **Výběr skrz objekt** (Solid): zakryté vrcholy/hrany se nevyberou, plocha = ta pod kurzorem, i box/lasso/kruh (CPU BVH ray cast, jen vůči aktivnímu objektu). Důkaz: `scripts/p2_occl_check.sh`.
- ✅ **P2b**: otevření 64-bit .blend s kolizí adres se teď nahlas odmítne (dřív tiché poškození). `scripts/blend_open_win.sh`.
- ✅ **Výkonový panel** `?perf=1` (FPS, ms, passy, immediate buffery). Měření: překreslení okna 13–15 ms bez ohledu na scénu, 60 % je JS↔wasm lepidlo WebGPU (viz BACKLOG). PC: orbit kostky ~40 FPS.
- ✅ **High-poly (P3)** na PC OK i s limity bufferů jako Safari (1,3 M trojúhelníků 38 ms, 5,2 M 180 ms) → příčina „chybí kusy“ na iPadu asi není limit bufferu; potřebuju čísla z iPadu.
- ✅ **Sada modelovacích testů** (27 operací, undo/redo, Ctrl+R, bevel, extrude, sculpt, Material Preview): vše OK, `docs/OPS_RESULTS.md`.
- ❓ **Z-fighting ploch**: na PC se nereprodukuje; aplikoval jsem hypotézu `invariant gl_Position` (Apple Metal fast-math → shodná hloubka v různých shaderech). Regresní sada `scripts/regress_all.sh` na PC PASS. Čeká na iPad.
## Co otestovat na iPadu (podle důležitosti)
Odkaz (platí, dokud běží PC + tunel; čistá data webu / soukromý panel): **https://automatically-folk-brakes-cornell.trycloudflare.com** — pro lištu kláves je `?touch=1` volitelné (na iPadu se zobrazí samo); panel výkonu přidej `?perf=1`.
0. **Soubory** (tlačítko 📁 na liště): ⬆ nahraj soubor (např. .blend/.obj/.png z aplikace Soubory) → je v /uploads (File ▸ Import / Open ho tam najde; **File ▸ Open** teď na iPadu otevře dialog „Choose file(s)…“). ⬇ stáhni, co Blender uložil/exportoval (Ctrl+S ukládá do `/opfs/home`, trvale v prohlížeči; export OBJ/FBX/GLB zadej do `/opfs/home/…` a stáhni přes 📁). Test PC: `scripts/open_file_win.sh`, `scripts/files_win.sh`.
0b. **Klávesnice a celá obrazovka**: tlačítko ⌨ na liště vyvolá klávesnici iPadu (přejmenování objektu = poklepat v Outlineru/F2, psaní čísel do polí). Navíc: Sdílet → *Přidat na plochu* → otevře se bez lišty Safari (celá obrazovka). Pokud ⌨ nevyvolá klávesnici, napiš.
1. **Dotyk** (otevři `?touch=1` pokud lišta není vidět): jeden prst táhne = otáčí pohled? Dva prsty roztáhnout/stáhnout = zoom (správným směrem)? Dva prsty táhnout = posun? Klepnutí = výběr? Dlouhý stisk = kontextové menu? Pencil: tah = box select / kreslení nástrojem? Ve Sculpt módu (Ctrl+Tab → Sculpt) tah Pencilem s různým přítlakem: mění se síla štětce? Případně napiš, co je moc citlivé/pomalé (konstanty v `demo/src/touch.js` nahoře).
2. **Lišta kláves**: Tab (edit mode), G/R/S + tah, Shift/Ctrl jako přepínače (modré = zapnuto), ↶ undo.
3. Čistá data webu → Tab, 3, klik na plochu, orbit: bliká/pere se výběr plochy? (pokud ano, aplikuju patch)
4. Solid, režim vrcholů (1): klepni na vrchol na zadní straně kostky → nesmí se vybrat. Režim ploch: vybere se plocha pod prstem.
5. Přepnutí workspace (Layout → Shading → Modeling): už by se nemělo sekat na překlad shaderů.
6. `?perf=1`: pošli screenshot panelu při orbitu na Monkey + Subdivision 3 a při ico sphere (Shift+A → Ico Sphere, v panelu Subdivisions 9 = 1,3 M trojúhelníků).

---

## Co jsem udělal (16.–17. 10. 2026)
| Krok | Oprava | Commit (fork `GGlukyy/blender`, větev `ipad`) |
|---|---|---|
| P2 | Hrany v edit modu + 3D kurzor se kreslí (chyběl `ssbo_attr_mask_` pro geometry resources; hypotéza „depth range“ byla špatně) | `fb68b6a6` |
| P2b | Výběr ploch/hran/vrcholů v **Solid** (web: geometrický nearest jako X-Ray, protože select-ID buffer nejde číst synchronně) | `f8388293` |
| P2c | 3D kurzor sedí na povrch: asynchronní CPU snapshot hloubky viewportu (120 ms po klidu), `read(DEPTH)` z něj | `d4ee1af8` |
| P2d | Modifikátory: **Array** (chyběly node assety — vendorováno do `demo/node-assets/`), **Subdivision Surface** (přidán OpenSubdiv, `scripts/build_opensubdiv.sh`; gessa patch 0111 + postup) | `d6e8ecff` |
| P2e | **Vrcholy v edit modu** jako quady (indexované body: CPU de-index + 4× replikace + sdílený quad ibo) | `d0e46c29` |
| A | Automatický parity test: `scripts/parity_win.sh` → `docs/PARITY_RESULTS.md` | (tento repo) |
`BLENDER_REF` v Makefile = `d0e46c29` (poslední). Vše pushnuto, master i `ipad`.

## Důkaz (testy na PC, Windows Chrome se skutečnou GPU; `scripts/p2_win.sh` / `parity_win.sh`)
- `scripts/p2_cursor_check.sh` PASS (kurzor ze snapshotu hloubky; `out/win/p2_depth_8_Home.png`: kurzor na přední hraně kostky při pohledu shora).
- `scripts/p2_points_check.sh` PASS (8 vrcholů jako quady; kostka posunutá o 3 m má body na rozích: `out/win/p2_ptsmove_9_Home.png`).
- Výběr plochy v Solid: `out/win/p2_sel_7_click.png`. Subsurf: `out/win/p2_sub_5_click.png`. Array: `out/win/p2_mod6_7_Home.png`. Bevel: `out/win/p2_mod5_7_NumpadDecimal.png`.
- Parity test: 13 ✅, 3 ❓ (extrude/Mirror/Solidify: bez chyby, výsledek se u kostky nedá poznat automaticky), 0 ❌ — viz `docs/PARITY_RESULTS.md`.

## Co nefunguje / omezení (poctivě)
- **Select-ID readback není vyřešen správně**, jen obejit: výběr v edit modu v Solid ignoruje zakrytí (vybere i skryté prvky, jako X-Ray). Plná oprava = přepsat operátory výběru na „kick-then-poll“ (gessa patche 0251–0257, 0305–0319, ~4000 řádků, mimo `webgpu/`) → až po rebase na 5.3 (krok R). Box/lasso select v Solid stejné omezení. Změněné soubory mimo `webgpu/`: `editors/mesh/editmesh_select.cc`, `editors/space_view3d/view3d_select.cc` (makro `SELECT_USE_ZBUF`, jen `__EMSCRIPTEN__`), `intern/opensubdiv/…` (3 guardy), `cmake/blender-wasm-cache.cmake`.
- **Depth snapshot** (3D kurzor): klik dřív než 120 ms po posledním překreslení → starý chování (kurzor na rovinu pohledu). Odhad: v X-Ray, v pohledu kamery a u objektů „in front“ může být hloubka jiná. Auto-depth při orbitu/zoomu se tím nejspíš také zlepší (neověřeno).
- Body vrcholů jsou menší než na desktopu (~4–5 px, desktop ~6 px) — odhad, nechal jsem.
- Subsurf: ověřen jen na kostce (CPU evaluátor); výkon na iPadu neměřen (Monkey + Subdivision 3 — nezkoušeno).
- Add-on `bl_pkg` (Extensions) se nezaregistruje (`_multiprocessing` chybí v CPythonu) — nízká priorita.
- Neotestováno (jen ručně): Ctrl+R, bevel/inset/knife, UV, materiály, uložení/otevření/import/export (TEST_CHECKLIST 14–16, 21–27).
- Starý `ninja` krok `bin/blender.js` pořád padá (očekávané, link dělá `link_blender_release.sh`).

## Co otestovat na iPadu (čistá cache: soukromý panel)
Odkaz: **https://declared-gentle-bullet-experimental.trycloudflare.com** (platí, dokud běží PC a tunel; stahuje ~200 MB).
1. Tab (edit mode) na kostce, `A`: vidíš oranžové **hrany i tečky vrcholů**?
2. Klik na plochu v režimu ploch (3) v Solidu: **vybere se** ta, na kterou klikneš?
3. Nástroj Cursor (vlevo, druhý), klepni na kostku, otoč pohled: **kurzor je na povrchu**? (Počkej asi ½ s po posledním pohybu pohledu.)
4. Modifikátory (klíč v pravém panelu → Add Modifier): **Subdivision Surface** (kostka se zakulatí, žádné žluté varování), **Array** (3 kostky), **Bevel**.
5. Pozor na rychlost: zkus Subdivision Surface level 2–3 na Monkey (Shift+A → Mesh → Monkey) a orbit — jak plynulé?
6. Cokoli, co vypadá špatně: screenshot nebo záznam obrazovky.

## Co dál (doporučené pořadí)
1. Tvoje zpětná vazba z iPadu k výše uvedenému.
2. **P1** (JS): WGSL seed pro plynulé přepnutí workspace — parity test ukazuje 20 s celkem na PC za cenu prvního překladu shaderů.
3. **R**: rebase na Blender 5.3 (až vyjde), pak správný async select (gessa série).
4. P2b/P3: high-poly (limity bufferů), P4 dotyk/Pencil.

---

# Starší: P0
Výsledek P0: ✅ P0 hotové (build na PC + demo běží na iPadu)

## Co jsem udělal (16. 10. 2026)
- `make all` → `configure-blender` → `ninja` → release link (`scripts/link_blender_release.sh`) ve WSL2.
- Opravy buildu (commity `1d71379`, `8f5dedb`, vše v `cmake/blender-wasm-cache.cmake`):
  - host `PYTHON_EXECUTABLE=/usr/bin/python3` (codegen skripty; bez něj `discover_nodes.py` spadl),
  - `-Wl,--allow-multiple-definition` (libpython má vlastní expat → 2 duplicitní symboly),
  - `--use-port=emdawnwebgpu` v linku (chyběly všechny `wgpu*` → assert `OFFSCREENCANVAS_SUPPORT assumes GL`),
  - `libbrotlidec.a` + `libbrotlicommon.a` v linku (jinak start spadl na `missing function: BrotliDecoderDecompress`, FreeType/WOFF2).
- Nový `scripts/p0_boot_test.mjs` (boot dema v Chrome; v headless SwiftShader je moc pomalý, nepoužívat).

## Důkaz
- Lukáš: screenshot z iPadu (Safari, vlastní build přes cloudflared HTTPS) — Blender běží.
- Lukáš: Windows Chrome, NVIDIA GPU — WebGPU adapter nalezen, po opravě brotli boot OK.

## Čísla (příště víme, co čekat)
- Čas: **~32 min** celý build od nuly (stažení emsdk + zdrojů 1 min, deps+Python+cmake 17 min, ninja ~12 min, link ~1 min) + ~1 min release link. Deps (~17 min) se při dalším buildu nepřekládají.
- Disk: **~11 GB** celkem (emsdk 1,6 GB, deps 3,7 GB, wasm-sysroot 0,26 GB, build-blender 0,56 GB, blender 0,48 GB, web/ 0,26 GB). Příručka odhadovala 100 GB — zbytečně moc.
- Velikost stahování pro iPad: `blender.wasm.zst` ~137 MB + `assets.tar.zst` ~64 MB (manifest: 143,98 MB / 66,67 MB nekomprimovaně).

## Co nefunguje / poznámky
- `ninja` poslední krok (`bin/blender.js`, node link) padá (`initial memory too small`, `wasmfs_create_provider_backend`) — **je to v pořádku**, stejně jako v upstream CI (`ninja … || true`). Skutečný link je `link_blender_release.sh`.
- Varování `undefined symbol: BZ2_*`, `sqlite3_*` při linku — odhad: nepotřebné moduly, při startu se nevolají.
- `demo/public/wgsl-cache.json` chybí (seed se negeneruje automaticky) → první spuštění překládá shadery za běhu. Řeší P1.
- Testy v `scripts/` mají napevno cesty z cizího PC (Radeon ICD, `DISPLAY=:0`, chromium-1228 cesta) — pro krok A je nutné upravit.
- Chromium potřebuje `libnss3 libnspr4 libasound2t64` (sudo apt).

## Co otestovat na iPadu
- Nic dalšího k P0. Pro příště: nový odkaz z `cloudflared tunnel --url http://localhost:5173` (adresa se mění při každém spuštění).

## Co dál
- **Krok A**: automatický parity test web vs desktop (nejdřív depth range + readback, pak body/velikost bodů v edit modu). Podle `docs/PLAN.md`.
