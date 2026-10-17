# BACKLOG — pořadí = priorita. [ ] čeká · [~] dělám · [x] hotovo · [!] blocked

## Bugy od Lukáše (iPad, 17. 10.)
- [~] APLIKOVÁNO `invariant gl_Position` (hypotéza, regresní sada `scripts/regress_all.sh` PASS na PC; čeká na iPad — pokud pořád bliká, napsat) (původně: nejde reprodukovat na PC): **Face select: z-fighting**
  Zkoušeno 17. 10.: Chrome/NVIDIA nemá z-fight (out/win/zf_before.png = zf_after.png, identické). Hypotéza
  `invariant gl_Position` ve WebGPU GLSL patchi je v `docs/patches/zfight_invariant_gl_position.patch`
  (neaplikováno, neověřeno; na iPadu otestovat po aplikaci). Depth bias v webgpu/ není vůbec (grep). Původní popis: — v režimu ploch se vybraná plocha „pere“ s nevybranou
  (overlay plochy a mesh mají stejnou hloubku). Desktop/Metal to řeší depth biasem pro face
  overlay (`overlay_edit_mesh_face`, ndc offset / polygon offset). Ověř, že WebGPU pipeline
  aplikuje stejný offset (depthBias / ndc_offset_factor). Repro: Tab, 3, klik na plochu, orbit.
- [x] (PASS: `scripts/p2_occl_check.sh` — zakrytý vrchol se nevybere, viditelný ano, plocha pod kurzorem: out/win/p2_occlhid_7_click.png, p2_occlvis_7_click.png, p2_occlface2_7_click.png; box/lasso v Solid pořád bez occlusion → nový bod níže) **Výběr skrz objekt** — klik vybere i prvek na zadní straně (dočasné obejití bez occlusion,
  commit a760dba). Oprava bez async GPU select: CPU occlusion test — po geometrickém nearest
  pickingu ověř raycastem (BVH editmesh, `BKE_bvhutils`/`ED_view3d_win_to_segment`), že prvek
  není zakrytý; nebo použij depth snapshot (P2c) a porovnej hloubku prvku s hloubkou pixelu.
  Konzultuj architekta, guard `#ifdef __EMSCRIPTEN__`.

- [x] (PASS: `scripts/p2_occl_check.sh` box — out/win/p2_occlboxhid_7_drag.png nic, p2_occlboxvis_7_drag.png vrchol; lasso/circle stejný kód, netestováno automaticky) Box/lasso/circle select v Solid respektuje zakrytí (`ED_mesh_web_occl.hh`). Occlusion jen vůči aktivnímu objektu.

- [x] (PASS na PC: `scripts/touch_win.sh`; čeká na iPad) **P4 dotyk/Pencil + lišta kláves** — `demo/src/touch.js`.

## Plán
- [x] **P1** (PASS: `scripts/wgsl_seed_win.sh verify` → TOTAL translations: 0, seed 179 shaderů; BLENDER_REF=f077479e. Příčina: Blender běží na pthread workeru, cache z main.js tam nebyla vidět → nikdy nefungovala; seed se načítá sync XHR. Regenerace: `scripts/wgsl_seed_win.sh seed`, `wgsl-cache.json` je v .gitignore (generovaný). Zbývá iPad: čistá data webu, přepnutí workspace) shader seed (`wgsl-cache.json`) pro všechny workspaces + edit mode + shading módy;
  test: cache-miss = 0 při prvním přepnutí.
- [x] (PASS: `scripts/perf_panel_win.sh`, out/win/perf_panel.png; PC baseline orbit kostky: 43 FPS, 23 ms, submits 13, passes 49, bindgroups 76) **Výkonový panel** `?perf=1`: FPS, ms/snímek, submity/passy, textury, wasm heap.
- [x] (analýzou, odhad) Velikost vrcholů: expanze quadu používá přesně `gl_PointSize` px (= theme.vert × 2 = 6 px), jako desktop; rozdíl je optický (kulatý bod). Na iPadu ověřit okem.
- [x] (PASS: `scripts/blend_open_win.sh` — dobrý 64-bit soubor OK, uměle poškozený (kolize adres) odmítnut s hláškou; fork má stejný `>>3` truncation jako gessa ADR-004; dlouhodobě pointer interning zůstává otevřené) **P2b** riziko korupce 64-bit .blend (gessa ADR-004): ověř + aspoň detektor kolizí.
- [!] BLOCKED na iPad data (PC test PASS: ico sphere 1,3 M trojúhelníků i 5,2 M s limity omezenými jako Safari 256 MiB/128 MiB se vykreslí celá bez chyb, `scripts/highpoly_win.sh 9 ipad`, out/win/hp_9i_orbit.png, hp_10i_orbit.png; 1,3 M = 38 ms/snímek, 5,2 M = 180 ms na NVIDIA. Limity bufferů tedy asi nejsou příčina; podezření: paměť wasm heapu (5 M tris = 2,3 GB) vs limit iOS tabu — potřebuju čísla z iPadu přes `?perf=1`) **P3** high-poly: model 500k–1M trojúhelníků, ověř limity bufferů a čas snímku.
- [x] (WONTFIX, analýzou: bl_pkg downloader.py spouští stahování přes `multiprocessing` `spawn` = nový proces, v prohlížeči nemožné; stub by jen schoval traceback a Extensions by stejně nefungovaly. Řešení by bylo přepsat downloader na vlákno — mimo cíl) `_multiprocessing` chybí → add-on Extensions (bl_pkg) se neregistruje (nízká priorita).

- [ ] (17. 10. zkoumáno bez výsledku: štětce mají preview v paměti z asset .blend → `filelist_cache_previews_push` čeká na `BKE_previewimg_is_finished`, které se asi nikdy nesplní; Python sonda přes mode_set(SCULPT) v timeru zasekla test. Další krok: log z `filelist.cc` + zjistit, zda se preview čte při načtení asset knihovny) Miniatury štětců v asset shelfu (Sculpt) zůstávají jako „hodiny“ — náhledy (preview) se negenerují. Kosmetické.

- [~] (mitigace PASS: `scripts/ops_win.sh` voxel_remesh_warns — operátor i modifikátor teď hlásí „built without OpenVDB“ místo ticha; samotný OpenVDB build zůstává otevřený) **Chybějící funkce (vypnuto v buildu, `scripts/ops_win.sh` je hlásí jako GAP):** Voxel Remesh / Remesh modifikátor VOXEL (chybí OpenVDB → výsledek prázdný!), Rigid Body (Bullet), Quadriflow. Pro sculpting je nejdůležitější Voxel Remesh — zvážit build OpenVDB pro wasm (těžké: TBB/Boost/blosc), jinak aspoň skrýt/varovat. Dyntopo funguje.

- [x] (hunt 17. 10.: `scripts/ops_win.sh` 56 testů failed=0; nově bisect, poke, remove_doubles, tris↔quads, fill, symmetrize, separate, transform_apply, parent, wireframe/solidify, curve/metaball convert, particle hair, vertex groups, UV pack, undo/redo, float image — vše odpovídá desktopu; žádné nové chyby) Lov chyb kolo 2: modelovací operace
- [x] (hunt: `scripts/uiops_win.sh` PASS — loop cut Ctrl+R, undo, inset, extrude, bevel přes skutečnou myš/klávesy, screenshoty out/win/uiops_*.png; knife K + Enter přes UI také PASS (10/15/7); sculpt viz sculpt_win.sh) Lov chyb kolo 3: nástroje přes UI

## Výkon (až nebude co opravovat)
- [x] (měřeno 17. 10., PC/NVIDIA, `scripts/drawtime_win.sh`, `scripts/profile_win.mjs` + `profile_window.py`) **Cena snímku**: překreslení okna = 13,4 ms (kostka) / 14,2 (Monkey+Subsurf 3) / 14,7 (ico 327k tris) → cena je skoro NEZÁVISLÁ na scéně, je to pevná režie UI + ~50 render passů + ~900 WebGPU volání. V profilu je ~60 % snímku JS↔wasm lepidlo emdawnwebgpu (`get`, `getWasmTableEntry`, `_wgpuQueueWriteBuffer`, `CreateBindGroup`, `CreateBuffer`), samotný draw/submit jen ~1,5 ms. Orbit přes `ND_SPACE_VIEW3D` překresluje i headery/lišty (upstream chování, stejné na desktopu): ~9 regionů × 2 passy z ~49. Nápady (nezkoušeno): (a) při modal navigaci nepřekreslovat headery (listener skip), (b) menší počet bind groups/passů, (c) sdružit immediate buffery (jen 10/snímek → malý přínos).
- [x] (změřeno 17. 10., PC: `scripts/uploads_win.sh`, nové počítadlo `writes=` v řádku WGPU_STATS: orbit 408 snímků: 169 `writeBuffer` / 205 KB na snímek, žádný upload > 64 KB → mesh buffery se NErenahrávají každý snímek; bind-group cache hit ~30–40 %, 15 submitů/snímek. Drobné zápisy (uniformy) jsou jen ~20 % ze ~900 volání; sloučení by dalo odhadem 1–2 ms z 13) Zbytečné re-uploady bufferů každý snímek? Pipeline cache hit rate?
- [x] (PC localhost, čistý profil, `scripts/startup_win.sh`: stažení 2 s, od Launch po první obsah 2,9 s, celkem 5,6 s; na iPadu dominuje stahování ~200 MB při první návštěvě, další start jde z cache — změřit na iPadu) Čas startu: kde se čeká (stahování, rozbalení, Python init, shadery) → zrychli největší.
