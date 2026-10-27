# Víkend — 28. 10. 00:35 — H22f: seed shaderů se na webu NIKDY nenačítal (opraveno)
Výsledek: ✅ PC, 🟡 čeká na iPad.
**Co:** worker neuměl složit URL k `wgsl-cache.json` (`Invalid URL`) → všech ~193 shaderů se překládalo za běhu (200–600 ms, špičky paměti ve wasm). Teď se předává absolutní URL; seed doplněn o 57 shaderů z MP (celkem 250).
**Důkaz:** `scripts/wgsl_seed_win.sh verify`: překladů 193 → 2; parity 0 ❌; shading ERRORS 0. Telemetrie `heap_mb` opravena (čte skutečný wasm), na PC v MP zůstává 1024 MB → „heap roste k 4 GB“ na PC nepotvrzeno.
**Co otestovat na iPadu:** `…/?mp=1&tel=1` (smaž data webu nebo soukromý tab) → Material Preview na Cube; mělo by být rychlejší start MP a méně pádů. Pošli ID relace.
**Nezkoušeno:** H22f(c) 1 vlákno překladu, (d) MAXIMUM_MEMORY; H22c/d.

# Víkend — 27. 10. 23:45 — H22a „MP Lite“ hotovo na PC
Výsledek: ✅ PC, 🟡 čeká na iPad.
**Co:** na iPadu (guard bez `?mp=1`) se při pokusu o Material Preview teď přepne na Solid s barvami/texturami materiálů, Studio světlem, Specular a Cavity (dřív šedý Solid). Jen JS/Python v `demo/src/main.js`, bez rebuildu.
**Důkaz:** `scripts/mp_lite_win.sh` (`?ipad=1`) PASS, screenshot `out/win/mp_lite.png`.
**Nález:** Workbench „Shadow“ na webu schová celý model (jen obrys) — i v Chrome na PC → v MP Lite vypnuto, neřešeno.
**Co otestovat na iPadu:** otevři normální adresu (bez `?mp=1`), přidej materiál s barvou/texturou, klikni na Material Preview → má být barevný model, ne šedý + hláška nahoře.
**H22b (taky hotovo na PC):** `?mp=1` na iPadu teď zapne EEVEE „lite“ (pixel size 2, 1 TAA sample, bez stínů/raytracingu/volumetrik). PC: textury 604→213 MB (JS odhad), 412→266 MB (C++), MP se kreslí, parity 0 ❌.
**Další iPad test:** `…/?mp=1&tel=1` → Material Preview na jednoduché scéně; pak `&mppx=4` (ještě menší). Pošli ID relace.
**Co dál:** H22c (serializace pipeline), H22e telemetrie.

# Víkend — 27. 10. 23:10 — N1: rebase na 5.3 je proveditelný (28 konfliktních souborů)
Výsledek: ✅ N1 změřeno (jen zjištění, nic nenasazeno), 🟡 C0 neudělán.
**Co:** větev `blender-v5.3-release` už existuje (9eaa3f28968, 3195 commitů po našem základu z 26. 6.). Do `./blender-5.3/` (blobless klon forku + remote `upstream`) jsem spustil `git merge-tree` naše `ipad` × `blender-v5.3-release` — bez checkoutu, bez buildu, `./blender/` a `BLENDER_REF` nedotčené.
**Důkaz:** náš port mění 113 existujících souborů + 32 nových (27 v `gpu/webgpu/` = bez konfliktu). **28 souborů v konfliktu:**
- EEVEE shadery/C++ (14): `eevee_defines.hh`, `eevee_film.cc`, `eevee_shadow.cc`, `eevee_film|gbuffer_write|geom_curves|geom_mesh|geom_pointcloud|light_culling|light_eval|volume .bsl.hh`, `infos/eevee_geom_infos.hh`
- draw/gpu shadery (6): `workbench_effect_outline_frag.glsl`, `draw_command_generate_comp.glsl`, `gpu_shader_utildefines.bsl.hh`, `gpu_shader_update_mipmaps.bsl.hh`, `gpu_shader_material_mix_color.bsl.hh`, `gpu/shader_tool/CMakeLists.txt`
- editory/wm (8): `editmesh_select.cc`, `view3d_select.cc`, `uvedit_select.cc`, `render_internal.cc`, `paint_cursor.cc`, `wm_draw.cc`, `wm_jobs.cc`; + `writefile.cc`, `dna_genfile.cc`, `creator.cc`
**Odhad práce:** konflikty jsou většinou v shaderech `.bsl.hh` (upstream je přepsal, naše H15 úpravy read_write → sampler se budou přenášet ručně) — odhad 1–2 dny, ne týdny. Plus `gpu/` má v 5.3 ~400 změněných souborů, takže backend půjde hlídat při buildu.
**C0 (Cycles měření):** neudělán — vyžaduje samostatný dlouhý build (`cmake/cycles-wasm-cache.cmake` už existuje, Embree/OSL vypnuté); pro iPad nepodstatné, nechávám `[ ]` na později.
**Co otestovat na iPadu (nejdůležitější):** beze změny — File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 22:15 — nová iPad relace `fjiwdv`, bez chyby
Výsledek: 🟡 nic k opravě.
V `out/ipad/` je nová iPad relace (Safari 26.5, 22:07, 165 s): start OK, 35 snímků, pak klid (Blender nic nekreslí, fps 0), tex 73 MB, **žádný `gpuerr`, `error` ani pád**; v 150 s tab přešel do pozadí (`visibility hidden`). Žádný Material Preview. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 21:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 18:32. Backlog: H18 PARKED, H15c čeká na iPad `gpuerr`, H20 hotové na PC, U1 posouzeno. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 21:10 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 18:32. Backlog: H18 PARKED, H15c čeká na iPad `gpuerr`, H20 hotové na PC, U1 posouzeno. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 20:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 18:32. Backlog: H18 PARKED, H15c čeká na iPad `gpuerr`, H20 hotové na PC, U1 posouzeno. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 20:05 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 18:32. Backlog: H18 PARKED, H15c čeká na iPad `gpuerr`, H20 hotové na PC. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 19:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 18:32 (nic nového od Lukáše). Backlog: H18 PARKED (čeká na crash log/nový důkaz), H15c čeká na iPad `gpuerr`, H20 hotové na PC. Rebase 5.3: tag `v5.3.0` pořád neexistuje. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** File ▸ Export ▸ OBJ → lišta „⬇ Stáhnout“; File ▸ Import ▸ „📁 Celá složka“; pak smaž data webu → `?tel=1` a pošli ID relace, pokud něco spadne.

# Víkend — 27. 10. 19:30 — H20: export se teď dá stáhnout
Výsledek: ✅ na PC (`fileio_matrix_win.sh` PASS), 🟡 iPad/itch neotestováno, H20 hotové jen částečně.
**Co:** exportéry píší do paměti Blenderu a soubor nikdo nepředal. Teď hlídám složky a po exportu naskočí lišta „⬇ Stáhnout <soubor>“ (stáhne se neprázdný soubor).
**Důkaz:** PASS obj (+mtl), stl, ply, glb, fbx, Image Save As, export do /opfs/home i do kořene. USD, Alembic, Collada, SVG export v tomto buildu **vůbec nejsou** (operátor chybí) → N/A.
**Nasazení:** `swap_build.sh` kopíruje atomicky (chyba „expected a module of at least 8 bytes“).
**Zbývá (netestováno, čeká na iPad):** matice (PC Chrome) pokrývá Export, Image Save As, Image.save, Save As/Save Copy (.blend se stáhne), Append, Link, Import, Image Open, Open, Revert, Add-on install; export v iframu (itch simulace) taky PASS. Zbývá image.save_as a Bake přes UI (potřebuje Image Editor), Safari emulace a iPad. Lišta se neukáže u exportu do `/mnt/<složka>`.
**Co otestovat na iPadu:** File ▸ Export ▸ OBJ → Export → objeví se lišta nahoře → ťukni „⬇ Stáhnout“ (na iPadu to otevře dialog stažení).

# Víkend — 27. 10. 18:30 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 16:44 (PC Chrome). Backlog: H18 a H15c čekají na iPad data. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1`, jen Cube, Material Preview zap/vyp 3×, pošli ID relace. Pak větší .blend a File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 18:00 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 16:44 (to je PC Chrome). Backlog: H18 a H15c čekají na iPad data. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1`, jen Cube, Material Preview zap/vyp 3×, pošli ID relace. Pak větší .blend a File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 17:30 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového iPad zápisu (Safari UA ve 16:42 je PC emulace Mac UA, poslední záznam 16:44 je Windows Chrome). Backlog: H18 čeká na iPad data, H15c na iPad `gpuerr`. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1`, jen Cube, Material Preview zap/vyp 3×, pošli ID relace. Pak větší .blend a File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 16:58 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
Poslední zápis v `out/ipad/` (16:44) je z Windows Chrome (PC test H18), ne z iPadu. H18 čeká na iPad data. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1`, jen Cube, Material Preview zap/vyp 3×, pošli ID relace. Pak větší .blend a File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 17:05 — H18: únik dummy textury (64 MB na framebuffer) opraven
Výsledek: ✅ na PC (`heapused_mp_win.sh` dummy 8192² 1×, `shading_win` ERRORS 0, `parity_win` 0 ❌), 🟡 iPad neotestován.
**Co:** architekt našel, že `fb_dummy_attachment` 8192² (64 MB) se při smazání framebufferu nikdy neuvolnila. Teď je jedna sdílená (fork 6184ae79, nasazeno v `demo/public`). Navíc na iPadu se shadow pool 128 MB použije i u otevřeného .blend (dřív 512 MB, +384 MB).
**Odhad:** že tohle zabíjí iPad, není potvrzeno; telemetrie ukazovala jen, že dummy vznikla 2×.
**Co otestovat na iPadu:** smaž data webu → `?tel=1&mp=1`, jen Cube, Material Preview zap/vyp 3×, pošli ID relace. Pak otevři větší .blend a zkus MP.

# Víkend — 27. 10. 16:30 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového iPad zápisu (poslední 15:53 je z PC Chrome). Backlog: H18 blokováno (chybí iPad data), H15c čeká na iPad `gpuerr`. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** `?tel=1&mp=1`, nová scéna jen s Cube, Material Preview: spadne i tak? Pošli ID relace. Pak File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 15:58 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
Nejnovější zápis v `out/ipad/tel_2026-10-27.jsonl` (15:53) je z Windows Chrome (PC test), ne z iPadu. Poslední iPad data jsou z 15:35 (H18, blokováno). Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** `?tel=1&mp=1`, nová scéna jen s Cube, Material Preview: spadne i tak? Pošli ID relace. Pak import přes File ▸ Import ▸ „📁 Celá složka“.

# Víkend — 27. 10. 17:10 — H19 doplněk: celá složka
Výsledek: ✅ na PC (`import_win.sh` PASS import + import_dir), 🟡 iPad neotestován.
**Co:** v liště importu přibylo „📁 Celá složka (model + textury)…“. Nahraje celou složku do `/uploads/<složka>/` se zachovanými podsložkami a file browser se přepne ke modelu.
**Odhad:** textury se najdou jen když má model relativní cesty. Safari na iPadu `webkitdirectory` podporuje, ale nezkoušeno.
**Co otestovat na iPadu:** File ▸ Import ▸ OBJ → „Celá složka“ → vyber složku s .obj + texturou.

# Víkend — 27. 10. 16:50 — H18 blokováno (potřebuju iPad data)
Výsledek: 🟡 H19 hotové (viz níže), H18 jsem nezačal měnit.
**Proč:** PC měření MP = 604 MB textur, iPad 657 MB, tedy stejné. Velké textury jsou nutné (sondy, viewport, stíny). Že iPad zabíjí právě paměť, je jen odhad: v telemetrii není `pagehide` ani `error`. Naslepo bych jen riskoval vzhled MP.
**Co by pomohlo (Lukáš):** `?tel=1&mp=1`, nová prázdná scéna (jen Cube), Material Preview — spadne i tak? Pošli ID relace. Kdyby ano, jde o paměť/počet textur; kdyby ne, o velikost scény.

# Víkend — 27. 10. 16:20 — H19: File ▸ Import nabízí soubor z počítače
Výsledek: ✅ na PC (`import_win.sh` PASS, `iframe_files_win.sh` PASS), 🟡 iPad/itch neotestováno.
**Co:** když se otevře file browser importu (File ▸ Import, Append/Link, Image ▸ Open…), nahoře se ukáže lišta „📂 Vybrat soubory z počítače…“. Vybrané soubory se nahrají do `/uploads` a file browser se tam přepne. Jen JS/Python, bez rebuildu.
**Neověřeno (odhad):** Image ▸ Open a textury (stejné pravidlo, netestováno), více souborů najednou, složky s texturami k modelu.
**Co otestovat na iPadu / itch:** File ▸ Import ▸ Wavefront (.obj) → klepni na lištu → vyber .obj (nebo .glb/.fbx) → v okně potvrď Import. Pak Image ▸ Open s PNG.

# Víkend — 27. 10. 07:47 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 01:14. Backlog: H15c čeká na iPad `gpuerr`, ostatní hotové na PC. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak model s více materiály a v itch zipu File ▸ Open/Save.

# Víkend — 27. 10. 07:17 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 01:14. Backlog: H15c čeká na iPad `gpuerr`, ostatní hotové na PC. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak model s více materiály a v itch zipu File ▸ Open/Save.

# Víkend — 27. 10. 06:46 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 01:14. Backlog: H15c čeká na iPad `gpuerr`, ostatní hotové na PC. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak model s více materiály a v itch zipu File ▸ Open/Save.

# Víkend — 27. 10. 06:15 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 01:14 (`tel_2026-10-27.jsonl`). Backlog: H15c čeká na iPad `gpuerr`, ostatní hotové na PC. Nic jsem neměnil ani nespouštěl. Rebase 5.3 čeká na tag `v5.3.0`.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak model s více materiály (chybějící faces) a v itch zipu File ▸ Open/Save.

# Víkend — 27. 10. 03:30 — kontrola: čekám na iPad data
Výsledek: 🟡 hotové věci čekají na iPad, nic dalšího bez dat nedává smysl.
`out/ipad/` bez nového zápisu od 01:14 (relace `1lzytn`). Hotovo na PC: H15b, H15c (část), H7c, M1, H17, R0, A. Compositor GPU shadery se na webu nepřeloží (známá mezera). Rebase 5.3 čeká na tag `v5.3.0`, Cycles není cíl víkendu.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak zkus model s více materiály (chybějící faces) a v itch zipu File ▸ Open/Save.

# Víkend — 27. 10. 05:00 — H15c: DOF a raytracing (fast GI) bez read_write rgba16f
Výsledek: ✅ na PC (`shading_fx_win.sh` 0 nevalidních storage textur, shading_win 0, parity 0 ❌), 🟡 iPad neotestován.
**Co:** stejná vada jako H15b v DOF a v „fast GI“ (raytracing): opraveno (fork `BLENDER_REF` v Makefile, nasazeno v `demo/public/`). Nový test s raytracingem + DOF + motion blur v kameře.
**Zbývá (nezachyceno testem):** ray_trace, motion blur, light probe bake, bxdf lut, gpencil, compositor — řešit podle iPad `gpuerr`.
**Co otestovat na iPadu:** Rendered/MP s kamerou a zapnutým DOF (Camera ▸ Depth of Field) nebo Raytracing: nesmí padnout `Storage texture layout not valid`.

# Víkend — 27. 10. 04:10 — A: vlastní add-ony fungují (PC), čeká na tvůj test v UI
Výsledek: ✅ na PC přes Python (`addon_custom_win.sh`, `addon_persist_win.sh`), 🟡 UI cestu jsem neklikal.
**Co:** instalace .py i .zip add-onu, zapnutí a spuštění operátoru funguje; soubor leží v `/opfs/home/.config/blender/5.3/scripts/addons` a přežije reload. Žádná změna kódu nebyla potřeba.
**Co otestovat na iPadu:** 📁 → nahraj zip (DropBake / Preflight) → Edit ▸ Preferences ▸ Add-ons ▸ ▾ ▸ Install from Disk → vyber `/uploads/<soubor>.zip` → zaškrtni. Po reloadu má zůstat. Add-ony s binárkami (.so/.pyd) nepůjdou.
**Rebase 5.3:** tag `v5.3.0` zatím neexistuje (`git ls-remote`), čekám.

# Víkend — 27. 10. 03:00 — R0: release zip pro itch.io je hotový
Výsledek: ✅ (`scripts/package_itch.sh`), nic jsem nenahrával.
**Co:** `out/itch_2026-10-27_0248.zip` (69,7 MB, žádný soubor > 45 MB). Bez Plausible, bez Puter brandingu a bez telemetrie; dole je „Neoficiální port, založeno na HeyPuter/blender-wasm“ + odkazy na zdrojáky (GPL). Obsahuje opravy H15b (Material Preview), M1 (chybějící faces), H17 (Open/Save v iframu).
**Pozor:** zip jsem neotestoval na itch.io ani na iPadu; Google Fonts se pořád načítají z internetu (jen písmo).
**Co dál (Lukáš):** nahraj zip na itch ručně → zkus na iPadu Material Preview (`?mp=1` v iframu nejde zadat, guard vrací Solid) a File ▸ Open/Save.

# Víkend — 27. 10. 03:40 — H17: Open/Save v iframu na itch.io (čeká na itch test)
Výsledek: ✅ na PC (`iframe_files_win.sh` PASS), 🟡 na itch neotestováno.
**Co:** v iframu je File System Access zakázán, proto se Průzkumník neukázal. Teď se v iframu chováme jako Safari: Open ukáže okno s výběrem souboru (`<input type=file>`), Save stáhne soubor. V rohu je tlačítko „↗ Otevřít v novém okně“ (plná verze). Jen JS, stačí nový zip na itch.
**Odhad:** jestli itch iframe povoluje stahování (`allow-downloads`); když ne, použij tlačítko v novém okně.
**Co otestovat na itch:** File ▸ Open → výběr souboru; File ▸ Save As → stáhne se .blend.

# Víkend — 27. 10. 03:15 — M1: chybějící faces opraveno (čeká na iPad)
Výsledek: ✅ na PC (`bigmesh_win.sh` 3× PASS, testovací model je celý, parity_win 0 ❌), 🟡 iPad neotestován.
**Příčina:** mesh s víc materiály se kreslí jako několik sub-rozsahů indexů přes indirect draw; začátek rozsahu se aplikoval 2× (v příkazu i v offsetu index bufferu), takže všechny materiály kromě prvního kreslily špatné trojúhelníky. Velikost meshe s tím nesouvisela. Postihuje to i iPad (stejný backend).
**Co:** `webgpu_batch.cc` (fork `BLENDER_REF` v Makefile), nasazeno v `demo/public/`. Nové testy: `scripts/bigmesh_win.sh` (koule s materiály, 0 děr), `scripts/model_run.sh` (načte testovací model z `out/models`).
**Co otestovat na iPadu:** načti model s více materiály (nebo koule s 5 materiály) → Solid → žádné chybějící obdélníky.

# Víkend — 27. 10. 02:10 — H7c: ochrana MP funguje i v iframu (itch.io) + oprava pádu při startu v iframu
Výsledek: ✅ na PC (`mpguard_win.sh` 4× PASS, `touch_win` ALL PASS), 🟡 iPad/itch neotestován.
**Co:** guard Material Preview se opírá o `navigator` (Mac UA + dotyk), takže v iframu na itch.io funguje bez query. `?mp=1` se v iframu zadat nedá (odhad: itch query rodiče nepředává). Při testu jsem našel skutečnou chybu: událost `focus` při startu v iframu zavolala `Module._blender_web_text_editing` před inicializací wasm → `Aborted(Assertion failed…)` a Blender se nespustil. Opraveno v `demo/src/touch.js` (čeká na `Module.calledRun`).
**Co otestovat na iPadu / itch:** nový build (`pnpm build`, zip) nahraj na itch a spusť — Blender se musí nastartovat a v Material Preview se vrátí Solid s pruhem.

# Víkend — 27. 10. 01:45 — H15b: Material Preview bez „Storage texture layout not valid“ (čeká na iPad)
Výsledek: ✅ na PC (`shading_win` ERRORS 0, 0× `WGPU_RW_STORAGE_BAD`; parity_win 0 ❌), 🟡 iPad neotestován.
**Co:** iPad telemetrie (relace `vrbw4v`, `a2wf2h`, `1lzytn` po 00:47) ukázala, že H15 nestačil. Safari smí `read_write` storage jen pro r32*; EEVEE film měl 4 další obrazy (`color_accum`, `out_combined`, `cryptomatte`, `radiance_feedback`). Opraveno (fork `17f5d86e`, nasazeno v `demo/public/`, záloha `out/bak_h15b/`). Na PC je teď test, který selže, když se do Chrome dostane takový shader (`shading_test.mjs`).
**Nezměřeno:** cryptomatte a F12 render passy (nový test zakázán); viewport compositor ukáže u cryptomatte jen kanál R (odhad).
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se opice? Pošli ID relace; `Storage texture layout not valid` tam už nesmí být. První start MP je delší (shadery film se překládají).
**Co dál:** H15c (stejná vada v dalších shaderech mimo výchozí MP) až po tvém testu.

# Víkend — 26. 10. 21:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 20:19. H15 a H16 hotové na PC, čekají na iPad; H9/H7b potřebují iPad data; H1-C a H12 blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se objekt? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak soukromý tab → červený panel.

# Víkend — 26. 10. 21:10 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 20:19. H15 (Material Preview) a H16 (soukromý tab) hotové na PC, čekají na iPad; H9/H7b potřebují iPad data; H1-C a H12 blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se objekt? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak soukromý tab → červený panel.

# Víkend — 26. 10. 20:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 20:19 (to už je zpracované: H15, H16). Backlog: H15 čeká na iPad, H9/H7b potřebují iPad data, H1-C a H12 blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se objekt? Pošli ID relace (nesmí tam být `Storage texture layout not valid`). Pak soukromý tab → má naskočit červený panel.

# Víkend — 26. 10. 20:50 — H16: soukromý tab a OOM z workeru (JS)
Výsledek: ✅ na PC (`oom_test.mjs` PASS pro `unhandledrejection` i `error` událost), 🟡 iPad neotestován (stačí reload).
**Co:** červený panel „Zavři ostatní taby“ se teď ukáže i pro `UnknownError … out of memory` z pthread workeru (window `error`). Navíc test IndexedDB při startu: když selže, panel „Soukromý tab není podporován“. Odhad: v Safari soukromém tabu IndexedDB funguje jen někdy, skutečné chování jsem na PC neověřil.
**Co otestovat na iPadu:** otevři stránku v soukromém tabu → má naskočit červený panel s vysvětlením (místo tichého selhání).

# Víkend — 26. 10. 20:35 — H15: příčina prázdného Material Preview nalezena (čeká na iPad)
Výsledek: ✅ na PC (`shading_win` ERRORS 0, MP se kreslí, `out/win/shading_material.png`), 🟡 iPad neotestován.
**Příčina (jistá z kódu + telemetrie):** Safari má `texture-formats-tier1`, ale ne tier2. EEVEE film shader používá `value_accum_img` jako `r16float` s `read_write` — to tier1 nepovoluje (jen write) → „Storage texture layout not valid“ → zahodí se celý command buffer. Ostatní storage formáty v seedu (r16float write, rgb10a2, rg16unorm write) jsou pro tier1 v pořádku.
**Co:** `eevee_film.cc` + `eevee_film.bsl.hh`: value_accum je R32F (fork `d5109753`). Nasazeno v `demo/public/`, záloha starého v `out/bak_h15/`. Film shadery nejsou v seedu přegenerované → přeloží se za běhu (první start MP o chvíli delší).
**Co otestovat na iPadu:** smaž data webu → `?tel=1&mp=1` → Material Preview: kreslí se objekt? Pošli ID relace (v telemetrii nesmí být `Storage texture layout not valid`).
**Nezměřeno:** jestli v MP je ještě jiná chyba po této; H16 (soukromý tab) zatím neudělán.

# Víkend — 26. 10. 19:50 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 14:14. H14 a OOM panel hotové na PC, čekají na iPad; H9 a H7b potřebují iPad data; H1-C a H12 blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu:** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → Material Preview (`?mp=1`). Pošli ID relace; `gpuerr` tam už nesmí být.

# Víkend — 26. 10. 19:20 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nového zápisu od 14:14 (`tel_2026-10-26.jsonl`). Backlog: H14 a OOM panel hotové na PC a čekají na iPad; H9, H7b potřebují iPad data; H1-C a H12 blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → Material Preview (`?mp=1`). Pošli ID relace; `gpuerr` tam už nesmí být.

# Víkend — 26. 10. 19:15 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
`out/ipad/` bez nové iPad telemetrie (poslední zápis 14:14). Backlog: H14 (override → const) a OOM panel jsou hotové na PC a čekají na iPad; H9, H7b potřebují iPad data; H1-C a H12 jsou blocked. Nic jsem neměnil ani nespouštěl (nové testy jsou zakázané).
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → Material Preview (`?mp=1`). Pošli ID relace; `gpuerr` tam už nesmí být. Při problému porovnej s `&overrides=1`.
**Doplněk 19:25:** `shading_win.sh` (Material Preview) znovu ERRORS 0 s H14. Počet specializovaných modulů v MP jsem nezměřil: test nevypisuje `OVR_SPEC`, na to by bylo potřeba upravit test.


# Víkend — 26. 10. 19:30 — hláška při `Out of memory` je teď přes celou obrazovku
Výsledek: ✅ na PC (`scripts/oom_test.mjs` PASS, `out/win/oom_1.png`), 🟡 iPad neotestován (JS, stačí reload).
**Co:** při `RangeError: Out of memory` při startu se ukáže červený celoobrazovkový panel „Zavři ostatní taby s Blenderem, tento tab úplně zavři a otevři znovu“ (dřív jen drobný stavový řádek + alert).
**Poznámka:** panel se vyvolá uměle (odmítnutý promise s RangeError); skutečný iOS OOM na PC nejde vyvolat.
**Co otestovat na iPadu:** otevři 2 taby s Blenderem a v druhém spusť Launch; při nedostatku paměti má naskočit červený panel.

# Víkend — 26. 10. 19:10 — H14: parity ověřena
Výsledek: ✅ na PC (`parity_win.sh` 0 ❌, report `out/parity/report.md`), 🟡 iPad stále neotestován.
Od 14:14 nepřibyla žádná iPad telemetrie, takže jsem jen doměřil, co zbývalo: H14 (žádný `override` pro Safari) nic nerozbil.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → Material Preview (`?mp=1`). Pošli ID relace; `gpuerr` tam už nesmí být. Při problému porovnej s `&overrides=1`.
**Co dál:** čekám na iPad data. `seed_verify` a počet modulů v MP zůstávají nezměřené.

# Víkend — 26. 10. 14:50 — H14: Safari už nedostane žádný `override` (JS, čeká na iPad)
Výsledek: 🟡 na PC funguje (wire_win ERRORS 0, shading_win ERRORS 0, screenshot Wireframe správně), `parity_win` jsem nestihl dokončit (vypršel čas) — **parity NEOVĚŘENO**. iPad neotestován.
**Co:** `demo/src/main.js` (`ovrPatch`, běží i v pthread workerech, kde jsou GPU volání): při `createRenderPipeline/createComputePipeline` se WGSL modulu přepíše — každý `override` → `const` s hodnotou z `constants` (nebo default) a `constants` se zahodí. `?overrides=1` vrátí původní cestu. Log `OVR_SPEC {...,"leftover":0}` v konzoli (leftover = zbylé overrides, na PC 0).
**Odhad/omezení:** na PC jen 3 specializované moduly v testu wireframe; EEVEE varianty nezměřeny (čas/počet modulů). Původní modul se pořád kompiluje (zbytečně).
**Co otestovat na iPadu:** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled; pak Material Preview (`?mp=1`). Pošli ID relace; v telemetrii nesmí být `gpuerr`. Při problému porovnej s `&overrides=1`.
**Co dál:** pustit `parity_win.sh` a `seed_verify`, změřit počet modulů v MP.

# Víkend — 26. 10. 14:06 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
V `out/ipad/tel_2026-10-26.jsonl` je 0 záznamů `gpuerr` a žádná nová iPad relace po `wa4u55` (ostatní nové relace jsou moje PC testy). Zbývá H9 (wireframe), H7b — obojí čeká na iPad data; H1-C a H12 jsou blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → pošli ID relace; pak totéž s `&noovfix=1`.

# Víkend — 26. 10. 14:10 — H9-4 i v C++ (čerstvé shadery)
Výsledek: ✅ na PC, 🟡 iPad neotestován. Stejný přepis computed overrides je teď i v `webgpu_shader.cc` (fork `3ea461d2`), takže se týká i shaderů mimo seed. Nasazeno do `demo/public/` (nový `blender.wasm.zst`, záloha starého v `out/bak_ovfix/`). Důkaz: C++ funkce dává na všech 193 seed shaderech stejný výsledek jako JS; `wire_win` ERRORS 0, `shading_win` ERRORS 0, `parity_win` 0 ❌. `?noovfix=1` vypíná jen JS část; C++ část je vždy zapnutá.

# Víkend — 26. 10. 14:00 — H9-4: nový podezřelý na černý Wireframe (JS, čeká na iPad)
Výsledek: ✅ na PC, 🟡 iPad neotestován (stačí reload, bez rebuildu).
**Co:** architekt našel, že wireframe shadery (a edit-mode hrany, EEVEE) mají v WGSL `override` bez `@id` s hodnotou počítanou z jiného override. WebKit s tím měl bug 275010; kdyby ho iPadOS 26.5 měl, pipeline je nevalidní a zahodí se celý command buffer overlaye = přesně zamrzlý wireframe. Odhad, ne jistota. `main.js` teď tyto řádky při načtení shaderů přepíše na vložený výraz (stejný význam).
**Důkaz:** seed: 7 shaderů změněno, 0 zbylých; `wire_win.sh` ERRORS 0, screenshot `out/win/wire_4.png` správně; `parity_win.sh` 0 ❌.
**Co otestovat na iPadu:** smaž data webu → Solid → Overlays ▸ Wireframe: kreslí se? Pak totéž s `?noovfix=1` na konci adresy (původní chování). Pokud je první OK a druhé černé = příčina nalezena. Navíc: Edit Mode — jsou vybrané hrany oranžové? A zkus Material Preview (možná i H4).

# Víkend — 26. 10. 13:40 — kontrola, beze změny
Výsledek: 🟡 nic nového k opravě bez iPadu.
V `out/ipad/` je jediná iPad relace dneška `wa4u55` (11:07, 175 s, bez pádu) — je z doby PŘED nasazením `gpuerr` (12:15), takže žádný `gpuerr` neobsahuje. Žádné jiné nové iPad záznamy. Zbývá H9 wireframe, H7b (obojí čeká na iPad data), H12 a H1-C blocked. Nic jsem neměnil ani nespouštěl.
**Co otestovat na iPadu (nejdůležitější):** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe → otoč pohled → pošli ID relace (v telemetrii pak hledám `gpuerr`).

# Víkend — 26. 10. 14:20 — H6b: „neuvolňují se buffery v MP“ není únik
Výsledek: 🟡 měření, žádná změna kódu.
V Material Preview je na PC 347 živých bufferů, jen 32 MB (trvalé EEVEE buffery), nic neuniká. Problém MP jsou TEXTURY (604 MB: 3× rgba16float 2048² = 96 MB, viewport 10× 65 MB, dummy 8192² 64 MB, depth 36 MB). Zmenšení dummy attachmentu ušetří max ~48 MB a riskuje stíny, tak jsem ho nechal. MP bez `?mp=1` zůstává blokovaný (ochrana H7).

# Víkend — 26. 10. 14:05 — H12 (ostřejší UI) BLOCKED, na iPad NEZKOUŠET
Výsledek: 🔴 `?dpr=2` je rozbité a moc paměťově náročné; výchozí `dpr=1` je beze změny (parity 0 ❌).
**Co jsem udělal:** přepínač `?dpr=N` (GHOST: velikost okna, myš, nativní pixel). Myš sedí (klik vybere objekt), ale UI se nezvětší a pravé panely jsou prázdné. **Paměť textur: dpr 1 = 64 MB, 1.5 = 298 MB, 2 = 917 MB** — iPad by spadl. Test `scripts/dpr_win.sh N`.
**Závěr:** ostřejší UI přes dpr je na iPadu asi nereálné; zvážit jen ostřejší UI bez ostřejšího viewportu (jiná práce, ne tento víkend).

# Víkend — 26. 10. 13:50 — H11b: Apple Pencil v modálním F/G/R/S/E
Výsledek: ✅ na PC, 🟡 iPad neotestován (JS, stačí reload; `demo/src/touch.js`).
**Co:** když běží modální operátor (klávesa nebo lišta), Pencil dotyk už nemačká levé tlačítko (to potvrdilo/zrušilo operaci na „přeskočené“ pozici). Teď jen posouvá kurzor, zvednutí potvrdí.
**Důkaz:** `scripts/brush_pen_win.sh` — F, Pencil dotyk + tah 70 px → režim `penmodal`, po zvednutí `idle`, hlavička ukazuje Size 500 px; `touch_win`, `touch_modal_win`, `pen_pressure_win`, `touch_sculpt_win` PASS.
**Co otestovat na iPadu:** Sculpt → F (Magic Keyboard nebo ⌨) → Pencilem se dotkni a táhni: velikost se mění plynule, zvednutím se potvrdí. Totéž G ve výběru. Pokud ne, napiš, co se stalo.

# Víkend — 26. 10. 13:25 — H11a: černý čtverec kolem kurzoru štětce opraven (na PC)
Výsledek: ✅ na PC (reprodukováno i opraveno), 🟡 iPad neotestován (nasazeno v `demo/public/`).
**Příčina:** WebGPU neumí swizzle textur, náš backend `GPU_texture_swizzle_set` ignoruje. Radial control (klávesa F) kreslí R8 masku se swizzlem `111r` → četla se jako neprůhledná → čtverec. Opraveno: na webu se textura vyrobí jako RGBA8 už s vypečeným swizzlem (stejně i `cursor overlay`). Fork `5a67d7d2`.
**Důkaz:** nový `scripts/brush_win.sh` (Sculpt → F → screenshot): před = čtverec 200×200, po = jen kruh (`out/win/brush_1.png`), ERRORS 0.
**Co otestovat na iPadu:** Sculpt → F → táhni myší/touchpadem: kolem kruhu nesmí být černý čtverec.
**Zbývá H11b:** Apple Pencil v modálním F zruší operaci (touch.js). Stejná vada swizzlu je i jinde (`imbuf/util_gpu.cc`, volume, EEVEE light probe volume) — zapsáno v BACKLOGU.

# Víkend — 26. 10. 13:05 — H9-2: PC nehlásí žádnou validační chybu
Výsledek: 🟡 H9 se na PC nedá reprodukovat. `wire_win.sh` teď testuje i Solid + Overlay Wireframe a chytá `WGPU_UNCAPTURED`: ERRORS 0, vykreslí se správně. Příčina je tedy Safari-specifická a víc bez `gpuerr` z iPadu nezjistím (test na iPadu viz blok 12:15).

# Víkend — 26. 10. 12:50 — H9-1: pojistka proti nevalidní kopii hloubky
Výsledek: 🟡 na PC beze změny chování (wire_win ERRORS 0, parity 0 ❌), iPad neotestován.
**Co:** `blit_to` a `Texture::copy_to` už nekopírují hloubku, když kopie není celý subresource / cíl je menší; přeskočí a zalogují. Odhad: možná příčina zamrzlého wireframe overlaye, na PC se nic nepřeskočilo, takže jistota až z `gpuerr` na iPadu.
**Test na iPadu:** stejný jako v bloku 12:15 (Wireframe, `?tel=1`, pošli ID relace).

# Víkend — 26. 10. 12:15 — H9-0: validační chyby Safari jdou do telemetrie
Výsledek: ✅ na PC, 🟡 iPad neotestován (nasazeno v `demo/public/`, fork `fc7301c3`).
**Co jsem udělal:** každá `uncapturederror` (hláška Safari) se teď pošle jako záznam `"kind":"gpuerr"` (text + posledních 6 passů + posledních 15 logů, max 20/sezení). Dřív šla jen do logu, který se do telemetrie nedostal.
**Důkaz:** `wire_win.sh` ERRORS 0, `parity_win.sh` 0 ❌. Samotný záznam jsem na PC nevyvolal (Chrome chyby nehlásí) — odhad, že na iPadu dorazí.
**Co otestovat na iPadu:** smaž data webu → `?tel=1` → Solid → Overlays ▸ Wireframe (zaškrtnout) → otoč pohled → pošli ID relace. Já pak v `out/ipad/` najdu `gpuerr` a uvidím, který příkaz Safari odmítá.
**Co dál:** H9-1 (audit blitu hloubky) a H9-2 dělat až podle `gpuerr` z iPadu, ať neopravuju naslepo.

# Víkend — 26. 10. 07:15 — kontrola, beze změny
Výsledek: 🟡 `out/ipad/` bez nové iPad telemetrie (poslední zápis 06:12 = PC testy). Backlog: zbývá jen H9, H7b (potřebují iPad data) a H1-C (blocked). Nic jsem neměnil ani nespouštěl. Seznam „Co otestovat na iPadu“ je v bloku „26. 10. 06:20“ níž.

# Víkend — 26. 10. 06:45 — kontrola, beze změny
Výsledek: 🟡 `out/ipad/` bez nové iPad telemetrie (poslední zápis 06:12 = PC testy). Nic jsem neměnil ani nespouštěl; seznam „Co otestovat na iPadu“ je v bloku níž.

# Víkend — 26. 10. 06:20 — konec běhu, čekám na iPad
Výsledek: 🟡 nic nového k opravě bez iPadu.
**Stav:** v `out/ipad/` není od 25. 10. 21:45 žádná nová iPad telemetrie (dnešní soubor obsahuje jen moje testy z PC Chrome). Hotové a nasazené: H1 A/B, H3, H5, H7, H8, H10, LRU cache bind groups. Fork `bb1ac2d2`.
**Zbývá (potřebuje iPad data, nebo je nízká priorita):** H9 wireframe, H7b `?mp=1` pád, H1-C (`glyphs@gpu_shader_text`, nízká priorita, až po iPad testu). Nové testy nespouštím (zakázáno zadáním).
**Co otestovat na iPadu (podle důležitosti):**
1. Smaž data webu → `?tel=1` → kostka → Sculpt → maluj 3 min. Pošli, jestli padá + ID relace.
2. Wireframe: `?tel=1`, přepni na Wireframe, otoč pohled, pošli ID relace (H9).
3. `?mp=1&tel=1`: zapni Material Preview jednou, drž 2 min, pošli ID relace i při pádu (H7b).
4. Magic Keyboard: přepni do jiné appky a zpět, klávesy musí fungovat.
**Blocked:** nic technického; čekám na iPad.

# Víkend — 26. 10. 06:50 — LRU cache bind groups
Výsledek: ✅ na PC, 🟡 iPad neotestován.
**Co jsem udělal:** při 2048 bind groups se už nevyhodí celá cache, ale jen starší polovina (LRU). Fork `bb1ac2d2`. Důkaz: `parity_win.sh` 0 ❌, `regress_all.sh` 67 sekcí 0 FAIL, `sculpt_mem_win.sh` PASS.
**Co dál (až po iPad testu):** H9 wireframe, H7b `?mp=1` pád (potřebují telemetrii z iPadu), H1 krok C (handly UBO/SSBO).
**Blocked:** nic; backlog bez dalších úkolů, které jdou dělat bez iPadu.

# Víkend — 26. 10. 05:00 — H1-B: bind groups přes dynamic offset
Výsledek: ✅ na PC, 🟡 iPad neotestován (nasazeno v `demo/public/`).
**Co jsem udělal:** změřil jsem (`WGPU_BG_WHY=1`), proč cache bind groups chybuje: 83 % kvůli offsetu push constants v klíči. Teď je offset dynamický (předává se v `SetBindGroup`), klíč ho neobsahuje. Fork `4c4fc907`.
**Důkaz:** miss kvůli offsetu 2 500 → 0 za 2 s ve Sculptu; `parity_win.sh` 0 ❌; `regress_all.sh` 67 sekcí 0 FAIL; screenshot UI — ikony různé, žádné blikání (starý bug „všechny ikony stejné“ se nevrátil). Při problémech na iPadu: `WGPU_PC_DYN_OFF=1` vrátí staré chování.
**Co otestovat na iPadu:** to samé co výš + zkontroluj, že ikony v panelech jsou různé a nic nebliká.
**Zbývá:** krok C (měnící se handly UBO/SSBO, ~330 missů/2 s), LRU místo vymazání celé cache při 2048.

# Víkend — 26. 10. 03:45 — H8: dva úniky GPU paměti ve Sculptu opraveny (na PC)
Výsledek: ✅ na PC, 🟡 iPad neotestován (nasazeno v `demo/public/`, stačí vite + reload; vymaž data webu).
**Co jsem udělal**
- **Měření (H8-0):** nový test `scripts/sculpt_mem_win.sh` (2 min tahů štětcem, řádek každých 10 s). wasm halda in-use je plochá (~297 MB, nerůstá) → pád Sculptu NENÍ wasm paměť. Telemetrie má nově `heap_used_mb`.
- **Únik 1 (hlavní):** `uniform_arena` bloky se ve vedlejších GPU kontextech (které nikdy „nepresentují“) nikdy neuvolnily → +~1 MB/s živých bufferů (9 → 107 MB za 2 min). Oprava: uvolnění po každém submitu (`flush_encoder`). Po opravě 23 MB za 2 min. Fork `1824e0bd`.
- **Únik 2 (H8-2):** zmenšený obrázek přes `immDrawPixels` (mipmapy) se nekešoval → 2 nové textury/s (256², 146² = přesně ty z tvé telemetrie). Teď keš; textur 160/2 min → ~5/min. Fork `1dcda418`.
- **H8-1:** `depth_snapshot` znovupoužije dost velký buffer (neměnit při každé změně velikosti okna).
- **H10:** `touch.js` vrací focus na canvas po návratu do appky/tabu a po doteku (naslepo).
**Důkaz:** `sculpt_mem_win.sh` před/po (buf_mb 107→23, tex_new 160→5), `parity_win.sh` 0 ❌ (po každé změně), `regress_all.sh` 67 sekcí: 1 FAIL `rna_sweep` (pád paměti v RNA setteru, samostatně PASS = nestabilní test), `p2_cursor_check` PASS, `shading_win` ERRORS 0, `touch_win` ALL PASS, `touch_modal` PASS.
**Co otestovat na iPadu (podle důležitosti)**
1. Smaž data webu → `?tel=1` → kostka → **Sculpt** → maluj štětcem 3 min (dřív pád ~157 s). Napiš, jestli padá + ID relace.
2. Wireframe shading (H9): `?tel=1`, přepni na Wireframe, otoč pohled a pošli ID relace (na PC to funguje → potřebuju data z iPadu).
3. `?mp=1&tel=1`: Material Preview zapnout jednou a držet 2 min; pošli ID relace, i když spadne (H7b).
4. Magic Keyboard: přepni do jiné appky a zpět — klávesy musí fungovat (H10).
**Co nefunguje / zbývá**
- H9 wireframe a H7b `?mp=1` pád: bez dat z iPadu nejdou opravit; PC reprodukce ne. Hypotéza H7b: iOS zabije stránku při přepnutí do Material Preview (GPU ~330 MB + wasm ~370 MB), odhad.
- Material Preview GPU ≈ 330 MB reálně (probes 96, viewport rgba16f 65, dummy 8192² 64 — nutný pro stíny, depth 36, shadow 32); dál zmenšit jen riskantně.
- H1-B (dynamic offsets) odloženo: bind groups ~1 500/s ve Sculptu na PC, ale bufferů/textur už vzniká málo; nejdřív výsledek iPad testu.
**Blocked:** nic technického; čekám na iPad.

# Víkend — 25. 10. 21:30 — konec běhu, čekám na iPad
Výsledek: 🟡 nic nového k opravě bez iPadu.
**Stav:** v `out/ipad/` není nová telemetrie (poslední 19:30). H1 A/C, H3, H5, H7, H6 krok 1 jsou hotové a nasazené. Zbylé položky (H1-B, H2, H6 krok 3) jsou podle zadání zakázané, dokud iPad neřekne výsledek; nové testy nespouštím.
**Co otestovat na iPadu (podle důležitosti):** 1) G + prudké tažení 10 s, pak 2 min práce (Solid). 2) `?mp=1&tel=1` Material Preview 2 min — pošli, jestli padá a `tex_mb`. 3) bez `?mp=1` se musí viewport sám vrátit na Solid.
**Blocked:** nic.

# Víkend — 25. 10. 21:30 — H6 krok 1: menší atlas odrazů v Material Preview
Výsledek: ✅ na PC, 🟡 iPad neotestován.
**Co jsem udělal:** EEVEE atlas sphere probes byl 4096² (rgba16float, 2 textury po ~179 MB). Změna na 2048² (`SPHERE_PROBE_ATLAS_MAX_SUBDIV` 11) → každá ~45 MB, dohromady úspora ~270 MB z ~790 MB. Fork `7498d505`.
**Důkaz:** log vytvořených textur před/po (`scripts/texmem_test.mjs`): `Probes` a `world_sphere_probe_` 4096² → 2048². `shading_win` ERRORS 0, screenshot Material Preview vypadá správně (odrazy na kovové opici). `parity_win.sh` 0 ❌. `regress_all.sh` 67 sekcí, **0 FAIL**. Poznámka: `seed_verify` hlásí 55 shaderů mimo WGSL seed (dřív 2) — Material Preview shadery se po změně defines překládají znovu; první Material Preview na iPadu bude o něco pomalejší (seed jsem nepřegenerovával; podle LESSONS překlad není úzké hrdlo).
**Nezměněno:** `fb_dummy_attachment` 8192² (64 MB) — viewport nesmí přesáhnout attachment, nechal jsem být. Celkově po změně odhadem ~520 MB, stále nad cílem 300 MB (odhad).
**Co otestovat na iPadu:** Material Preview je pořád zablokovaný ochranou H7. Zkus s `?mp=1` v adrese: kostka → Material Preview → drž 2 min; pošli, jestli padá, a telemetrii (`tex_mb`).
**Co dál:** shadow atlas 2048²×8 r32uint a G-buffery (viz BACKLOG H6, krok 3), jen pokud iPad ukáže, že to pořád padá.

# Víkend — 25. 10. 21:15 — H7 ochrana Material Preview na iPadu
Výsledek: ✅ na PC, 🟡 iPad neotestován.
**Co jsem udělal:** na iPadu (dotyk + Mac/iPad UA) Python timer každých 0,5 s vrátí 3D viewport z Material Preview/Rendered na Solid a ukáže pruh „Material Preview na iPadu zatím nefunguje… přidej ?mp=1“. `?mp=1` ochranu vypne. Jen `demo/src/main.js`, bez rebuildu.
**Důkaz:** `scripts/mpguard_win.sh` 3× PASS (`?ipad=1` → SOLID + pruh; `?ipad=1&mp=1` → MATERIAL; PC bez parametru → MATERIAL).
**Co otestovat na iPadu:** reload stránky (vite dev stačí), kostka → přepni na Material Preview → viewport se musí sám vrátit na Solid a ukázat oranžový pruh. S `?mp=1` v adrese Material Preview zůstane (může spadnout).
**Co dál:** H6 (snížit GPU paměť Material Preview, ~2 h max) — viz BACKLOG.

# Víkend — 25. 10. 20:30 — H5 depth_snapshot hotovo, nasazeno
Výsledek: ✅ na PC (s poznámkou), 🟡 iPad neotestován.
**Co jsem udělal:** `depth_snapshot` (čtení hloubky pro výběr) už nevytváří a neničí buffer při každém snímku, ale znovupoužívá až 2 buffery (fork `f37cd1c9`).
**Důkaz:** `parity_win.sh` 0 ❌. `regress_all.sh`: 1 FAIL v `prefs_sweep` (`done=0`, pád u `mouse_emulate_3_button`). Ten test je dřív zaznamenaný jako nestabilní (~50 %); samostatně teď 3× PASS, takže to **nejspíš není moje změna** (odhad, ostatní sekce bez FAIL).
**Co otestovat na iPadu:** to samé co dřív (G + prudké tažení 10 s, pak 2 min práce) + **Material Preview s `?tel=1`**, a pak ještě s `?tel=1&nocompute=1` (viz H4 výš). Hlavně pošli, jestli padá a za jak dlouho.
**Blocked:** nic. H1-B, H2 záměrně nedělám, dokud nebude iPad výsledek.

# Víkend — 25. 10. 18:30 — H4 diagnostika (abort v Material Preview)
Výsledek: 🟡 diagnostika nasazena, příčina zatím neznámá (odhad: compute cesta na Safari).
**Co jsem udělal:** telemetrie teď při abortu pošle JS stack (`kind:abort`); compute dispatch loguje každý krok; přepínač `?nocompute=1` compute vypne. Fork `883a0fa4`.
**Důkaz:** PC Chrome, `shading_win.sh` (Material Preview) ERRORS 0.
**Co otestovat na iPadu:** 1) smaž data webu, otevři s `?tel=1`, kostka → Material Preview. Když padne, telemetrie řekne poslední krok. 2) Zkus znovu s `?tel=1&nocompute=1` — nesmí spadnout (kreslení bude špatně, to je v pořádku). Napiš oba výsledky.
**Co dál:** po výsledku opravit příčinu; pak H5 (depth_snapshot), H1-B.

# Víkend — 25. 10. 21:00 — H1 + H3 hotovo, nasazeno, čeká na iPad
Výsledek: ✅ na PC (regress_all 59 sekcí 0 FAIL, parity 0 ❌), 🟡 iPad neotestován.
**Nové od 17:00:** H3 — zdroj textur byl `immDrawPixels` (`editors/screen/glutil.cc`, obrázek 495×247, vytvářel se a ničil při každém překreslení, ~20×/s). Teď cache 4 textur: `tex_new` 20 → 0,1/s. Fork `a0720ed8`, `BLENDER_REF` aktualizován.
**Při tažení G na PC (12 s):** nové buffery 0/s (bylo ~1130), bind groups ~40/s (bylo ~690), textury 0,1/s (bylo ~20), views ~21/s. Nasazený build v `demo/public/` je tenhle.
**Co otestovat na iPadu (pořadí):** viz blok výš (smazat data webu → kostka → Tab → plocha → G → prudké tažení 10 s → pak 2 min běžné práce). Když padne, napiš čas od startu; telemetrie řekne víc.
**Blocked:** nic. H1-B a H2 záměrně neděláme, dokud iPad neřekne, že pád trvá (bg_new už je nízko, submit_lag ≈ 0 na PC).
**Poznámka (LESSONS):** po `timeout` zůstanou viset node/Chrome — před každým testem `taskkill`; jinak testy „visí“.

# Víkend — 25. 10. 17:00 — iPad pád: H1 (buffery + bind groups) hotovo na PC
Výsledek: ✅ na PC, 🟡 iPad neotestován (NASAZENO v `demo/public/`, stačí reload).
**Co jsem udělal**
- Změřil jsem, co při tažení (G) vzniká: ~1130 bufferů/s, ~690 bind groups/s, ~40 views/s, ~20 textur/s (`drag_win.sh`, `docs/MEMORY.md`). Zpoždění submitů ≈ 0 → H2 (brzda snímků) se na PC neprojevuje.
- H1-A: immediate mode má jeden trvalý ring buffer místo bufferu na každé immEnd (0 nových/s). Vypínač `WGPU_IMM_RING=0`.
- Histogram (`DRAGHIST`) ukázal, že hlavní zdroj jsou SSBO (620/s) a VBO (480/s) z copy-on-write → H1-C: pool bufferů, který znovupoužívá buffery po odeslání (místo destroy). Vypínač `WGPU_NO_POOL=1`.
**Důkaz (PC Chrome, drag 12 s):** buf_new 1130 → **0**/s, bg_new 690 → **59**/s, živých bufferů max 325. `parity_win.sh` 0 ❌, `regress_all.sh` 59 sekcí 0 FAIL (po ringu i po poolu). Fork `GGlukyy/blender` větev `ipad` 5d0f6d8f, `BLENDER_REF` aktualizován.
**Co nefunguje / zbývá:** nové textury ~20/s (H3), `uniform_arena` offsety v klíči cache (H1-B) — `bg_new` je už jen 59/s. Na iPadu nic z toho neověřeno.
**Co otestovat na iPadu (podle důležitosti)**
1. Smaž data webu (Nastavení → Safari → Pokročilé → Data webových stránek) nebo soukromý tab, načti stránku.
2. Kostka → Tab → režim ploch → vyber plochu → G → **prudce táhni prstem ~10 s**. Nesmí spadnout (dřív pád za 33–40 s od startu).
3. Pak běžná práce ~2 min (sculpt, Material Preview, UV). Pokud padne, pošli čas pádu — telemetrie je zapnutá.
**Co dál:** H3 textury, pak H1-B.

# Víkend — 25. 10. 11:50 — touch_fuzz Material Preview
Výsledek: ✅ na PC. `touch_fuzz_win.sh` s `TF_SHADING=MATERIAL` (viewport v Material Preview): seed 61 × 200 gest PASS (0 chyb, Blender odpovídá). Backlog: zbývají jen položky čekající na iPad nebo nízká priorita. iPad neotestován.

# Víkend — 25. 10. 12:50 — dotykový fuzz (nový)
Výsledek: ✅ na PC. Nový `scripts/touch_fuzz_win.sh` (`TF_SEED`, `TF_N` přes WSLENV): náhodná gesta přes CDP — tap, tah, pinch, 2prstý pan, dlouhý stisk, touchCancel, 3 prsty, tlačítka lišty, klávesy. Seed 11/12/13 × 250 gest: 0 chyb stránky, bez ztráty GPU, Blender po všem odpoví (Python timer). Dotek na iPadu to ale nenahradí. Edit mód (`TF_EDIT=1`): oprava — první edit běhy dřív neběžely v edit módu (klávesa Tab šla mimo viewport, myš nebyla nad plátnem); teď test myš přesune nad viewport a vypíše `start mode=`. Znovu seed 21/22/23 × 400 gest v EDIT: PASS (0 chyb, Blender odpovídá). Dřívější zápisy o `TF_PRE` (Ctrl+Tab,1 / Shift+Z) neplatí — pie menu přes klávesy mód nezmění, `TF_PRE` je jen obecné předstisknutí kláves (např. `Tab`). Sculpt a paint módy: `TF_MODE=SCULPT|WEIGHT_PAINT|VERTEX_PAINT` (Python timer přepne mód), start mode ověřen výpisem — seed 52 × 300 gest SCULPT i WEIGHT_PAINT PASS (0 chyb). Žádná nová BACKLOG položka.

# Víkend — 25. 10. 12:20 — fuzz seed 901/902
Výsledek: ✅ na PC. `fuzz_win` (325 a 317 op) a `fuzz_obj_win` (372 a 380 op) seed 901, 902: bez pádu wasm. Žádná nová BACKLOG položka.

# Víkend — 25. 10. 12:00 — model_ops9
Výsledek: ✅ na PC. Nový `scripts/model_ops9_win.sh`: 13/13 PASS (křivka subdivide/bevel→mesh, NURBS plocha, shape key, Geometry Nodes Transform + Instance on Points (114 instancí), UV sphere project + pack, obrázek pixely + uložit PNG, bmesh subdivide, lattice, array, boolean EXACT difference). Žádná chyba portu (2 FAIL byly chyby testu: 8bitová přesnost pixelů, instance se nepočítají jako vrcholy). iPad neotestován.

# Víkend — 25. 10. 11:40 — ui_fuzz seed 701 (800 akcí)
Výsledek: ✅ na PC. `ui_fuzz_win` FULL seed 701 (800 akcí), 801 (869), 802 (900): 0 chyb, bez pádu. Backlog: zbývají jen položky čekající na iPad nebo nízká priorita (Subsurf na trojúhelnících, Skin); výkon je změřený (viz BACKLOG „Výkon“), nový hotspot nenalezen.

# Víkend — 25. 10. 11:10 — model_ops8
Výsledek: ✅ na PC. Nový `scripts/model_ops8_win.sh`: 15/15 PASS (subdivide řez, split, separate loose, flip normals, auto smooth, crease, mark sharp + edge split, fill holes, tris↔quads, apply stack, collection instance, decimate planar, text→mesh, undo/redo). Žádná chyba portu (FAIL byly chyby testu: `mesh.split` s vybraným vším nic nedělá, `edge_bevel_weight` v 5.x není, screw/sculpt stroke potřebují view3d kontext → vyřazeno). iPad neotestován.

# Víkend — 25. 10. 10:50 — lov chyb fuzz (seed 601–603)
Výsledek: ✅ na PC. `fuzz_win` 601, `fuzz_obj_win` 602 (340 op), `ui_fuzz_win` 603 FULL: bez pádu, 0 chyb. Žádná nová BACKLOG položka. iPad neotestován.

# Víkend — 25. 10. 10:30 — regress_all po P94 dokončen
Výsledek: ✅ na PC. `regress_all.sh` doběhl: 59 sekcí, **0 FAIL** (`out/regress.log`, 10:08). Nasazený build beze změny. Nová iPad telemetrie není (sezení z 10:05–10:10 jsou z PC, bufmax 104–245, ploché). iPad stále neotestován — pořadí testů viz „SOUHRN PRO LUKÁŠE“ níže.

# Víkend — 25. 10. 10:00 — regress_all po P94 (neúplný)
Výsledek: 🟡 `regress_all.sh` dosud 51 z 59 sekcí, **0 FAIL** v dosavadním logu (`out/regress.log`); poslední sekce ještě běžela při konci času. Kód portu se od posledního úplného běhu (P91, 0 FAIL) nezměnil, přibyly jen testy model_ops5–7. iPad neotestován.

# Víkend — 25. 10. 09:10 — model_ops7
Výsledek: ✅ na PC. `scripts/model_ops7_win.sh` 11/11 PASS: cyklus módů (edit/sculpt/vertex/weight/texture paint), vertex color fill, weight normalize, particles (50), cloth 10 snímků (pohyb ověřen), rigid body, fluid domain, soft body, uzly materiálu, render nastavení. Žádná chyba portu (FAIL byly chyby testu: particles čtu z evaluated objektu, barva štětce je v 5.x v `unified_paint_settings`, počet linků včetně výchozího). iPad neotestován.

# Víkend — 25. 10. 08:59 — lov chyb fuzz
Výsledek: ✅ na PC. `ui_fuzz_win` seed 511 (400 akcí) a 512 FULL (500 akcí): 0 chyb. `fuzz_win` seed 501 (291 op) a `fuzz_obj_win` seed 503/504 (~425 op každý) — bez pádu wasm (operator_errors jsou očekávané špatné kontexty). Žádná nová chyba, žádná nová BACKLOG položka. Výkon už je v BACKLOGu změřený (žádný nový hotspot). Co otestovat na iPadu: beze změny (viz „SOUHRN PRO LUKÁŠE“ níže, bod 1–3).

# Víkend — 25. 10. 08:58 — model_ops6
Výsledek: ✅ na PC. `scripts/model_ops6_win.sh` 12/12 PASS (všechny primitiva mesh/curve/metaball/empty/světlo/kamera/armature, separate+join, constraint, driver, origin_set, mirror objektu, křivka s bevel → mesh, metaball → mesh, boolean EXACT union, OBJ export+import, smart project layout, undo). Žádná chyba portu; FAIL byly chyby testu (neexistující operátor lattice_add, view3d operátor bez viewportu, špatné očekávání rozložení UV). iPad neotestován.

# Víkend — 25. 10. 08:56 — model_ops5
Výsledek: ✅ na PC. Nový `scripts/model_ops5_win.sh`: 19/19 PASS (inset, ring+subdivide, bridge loops, fill grid, extrude hran, edge slide, remove doubles, normály, convex hull, seam+unwrap, cube project/lightmap, přiřazení materiálu, mirror/weld/shrinkwrap, select similar, bisect fill, apply scale, uložit+znovu otevřít .blend). Žádná chyba portu (všechny prvotní FAIL byly chyby testu: špatné názvy operátorů 5.x, inset celé kostky, špatný očekávaný počet). Nasazený build beze změny; iPad neotestován, žádná nová iPad telemetrie.

# Víkend — 25. 10. 09:30 — regress_all po P87–P91
Výsledek: ✅ `regress_all.sh` 59 sekcí, **0 FAIL** (log `out/regress_p91.log`). Nasazený build beze změny, od rána jen JS (hláška OOM) + nové testy. iPad stále neotestován.

# Víkend — 25. 10. 08:40 — modtime + Subsurf obejití
Výsledek: ✅ na PC. `scripts/modtime_win.sh`: 17 modifikátorů na UV sphere 8k vrcholů, všechny < 1 s kromě Subsurf level 2 (2,4 s při prvním výpočtu, 130k vrcholů). Žádný nový hotspot. `subq_win.sh`: u trojúhelníků pomůže vypnout „Use Limit Surface“ (0,03 s místo 2,65 s) — viz BACKLOG.

# Víkend — 25. 10. 08:10 — model_ops4
Výsledek: ✅ na PC. `scripts/model_ops4_win.sh` 12/12 PASS (armature auto-weights, keyframy, lattice, cast, edge split, remesh blocks, multires, uzly materiálu, color attribute, Geometry Nodes subdiv + apply, kolekce, kamera/světlo). Žádná chyba portu (1 FAIL byl chyba testu: kostka v jiné kolekci).

# Víkend — 25. 10. 07:55 — model_ops3
Výsledek: ✅ na PC. Nový `scripts/model_ops3_win.sh`: 13/13 PASS (array, solidify, bevel hran, smazat plochu+fill, tris↔quads, proportional edit, spin, křivka→mesh, text→mesh, vertex group, shape key, linked duplicate, UV pack). Žádná nová chyba portu. (2 prvotní FAIL byly chyby testu — špatný vybraný vrchol, špatné počítání meshí — opraveno v testu, ne v kódu.)

# Víkend — 25. 10. 07:40 — P87 hláška při nedostatku paměti
Výsledek: ✅ na PC, 🟡 iPad neotestován (žádná nová iPad telemetrie).
- Když Safari po pádu GPU nedá wasm paměť (`RangeError: Out of memory`, iPad telemetrie 23. 10.), stránka teď ukáže „Zavři tento tab…“ + alert místo věčného „Loading Blender…“. `scripts/oomhint_win.sh` PASS (simulovaný reject; skutečné OOM jen na iPadu). fetchretry_win PASS.
- `parity_win.sh` po P87: 0 ❌ (2 ❓ Mirror/Solidify na kostce v počátku = očekávané).
- Co otestovat na iPadu: po pádu GPU hned znovu otevři stránku — pokud se objeví hláška o paměti, napiš.

# SOUHRN PRO LUKÁŠE — sobota 25. 10. ráno (čti první)
Výsledek: ✅ na PC, 🟡 iPad neotestován (žádná nová iPad telemetrie od 23. 10.).
**Hlavní oprava:** při tažení (G) se GPU buffery nikdy neuvolňovaly (+300/s → pád) — příčina nalezena a opravena (K3b). Drag test: živých bufferů plochých (86 místo 1639).
**Další změny (vše bez zásahu do tvého workflow):** obnovení práce po pádu (popup + File menu), hlídač paměti (pruh při ≥1500 MB), Undo Memory Limit 300 MB (příčina růstu paměti = undo kroky), víc testů (model_ops2, formats, optime, leak, soak).
**Otestuj na iPadu v tomto pořadí:** (1) čistá data webu → kostka → Tab → plochy → vyber → G v liště → prudce táhni 10+ s → potvrdit; (2) zavři tab, otevři znovu → popup „Obnovit poslední práci“; (3) těžká operace (Subdivision level 5) → objeví se pruh s pamětí?
**Nalezené, neopravené (BACKLOG):** Subsurf na trojúhelnících 10 s při prvním výpočtu, Skin na hustší síti, DPX načtení zamrzne, chybí WEBP/USD/Alembic/Collada, AVIF uložení selže, žádná čeština v UI.
**Otočení iPadu:** `rotate_stress_win.sh` (40× portrait↔landscape v edit módu) PASS — bez ztráty GPU, bez chyb.
**Tab na pozadí:** `freeze_win.sh` (Page lifecycle frozen 20 s → active) PASS — Blender pokračuje, bez ztráty GPU. (Pád „TypeError: Load failed“ z iPad telemetrie 23. 10. se na PC nereprodukuje.)
**Stažení při pozadí:** wasm/assets se při selhání (iOS „Load failed“ v pozadí) stáhnou znovu (až 3×, čeká na viditelný tab). `fetchretry_win.sh` PASS (1. stažení uměle přerušeno → Blender nastartuje). Odhad: řeší „Load failed“ z iPad telemetrie 23. 10.
**Regrese:** `regress_all.sh` 59 sekcí, 0 FAIL (po každé změně).

# Víkend — 25. 10. 02:45 — K3b HOTOVO (příčina pádu při tažení nalezena a opravena na PC)
Výsledek: ✅ na PC, **iPad neotestován**.
- **Příčina:** při tažení držel jiný (neaktivní) GPU kontext nesubmitnutý příkaz po celou dobu → buffery se nikdy neničily (+300 živých/s).
- **Oprava:** kontext při přepnutí pryč příkazy odešle; mazání buffer jen těch, které nemůže odesílaný příkaz už používat (fork `e97a363d`, `BLENDER_REF`).
- **Důkaz:** `scripts/drag_win.sh`: živých bufferů max 86 (dřív 1639 za 10 s), zničeno 4029 z 4115. `regress_all.sh` 59 sekcí 0 FAIL; `parity_win.sh` 0 ❌. Nasazený build = nový.
- **K5 hotovo:** po pádu a novém načtení se po ~5 s ukáže popup „Obnovit poslední práci“ (a trvale File ▸ Obnovit poslední práci). `scripts/restore_win.sh` PASS. Na iPadu: pracuj, zavři tab, otevři znovu → popup / File menu.
- `mem_win.sh` po K3b: živých bufferů max **120** (UV Editing dřív 2901, ostatní 79–88) — GPU paměť je teď plochá ve všech scénářích.
- Lov chyb po K3b: `fuzz_win` seed 401/402 (≈430 op), `fuzz_obj_win` 411/412 (≈500 op), `ui_fuzz_win` 421/422 (~1800 akcí) — vše PASS, bez pádu.
- Nový test `scripts/model_ops2_win.sh` (subdivide, extrude podél normál, bisect, mirror apply, boolean, merge, dissolve, undo/redo, join, shade smooth, decimate, symmetrize): 12/12 PASS. Nález: skriptové `ed.undo()` bez `undo_push` zamrzne (jen skript, viz BACKLOG; Ctrl+Z klávesou OK).
- Výkon po K3b (`drawtime_win.sh`): monkey subsurf3 15,1 ms, ico6 edit 18,8, ico7 edit 29,7 (api 49 ms), ico8 17,9; submity 25–33, passy 73–82 = **beze změny proti dřívějšku** (submit při deactivate nic nezpomalil).
- Dotykový teploměr `scripts/drag_touch_win.sh` (G z lišty + tah prstem přes CDP, `MOVECAP=0|33|66`): živých bufferů max 86 i při dotyku; buf_new/s na PC stejné pro movecap 0 i 33 (PC je omezené ~3 fps, ne počtem pohybů) → vliv movecap se ukáže jen na iPadu.
- Pozor: nízké FPS (3–10) v `drag_win.sh` není výkon Blenderu (v Object módu stejně, api_ms < 1) — omezuje to dávkování událostí v Playwrightu; `OBJMODE=1`, `STEPS`, `PAUSE` přidány do testu.
- 🔎 M4 zkouška: **512 MB + 32 vláken** (`out/m4c/`) taky padá v `prefs_sweep` (`memory access out of bounds`, `mouse_emulate_3_button`) → pád souvisí s **počáteční velikostí paměti (<1 GB) = růst haldy s vlákny**, ne s počtem vláken. Hypotéza (odhad): když halda roste za běhu (`ALLOW_MEMORY_GROWTH` + pthreads), vlákna mají zastaralý pohled → OOB. Důsledek: na iPadu by růst nad 1 GB mohl padat stejně → raději nezmenšovat INITIAL_MEMORY. Nasazený build zůstal 1 GB/32 vláken (záloha `out/bak_k3b/`).
- Výkon operací (`optime_win.sh`, 30 operací na 10k vrcholů): vše < 1 s kromě Subsurf na trojúhelnících (10 s při 1. výpočtu) a Skin na hustší síti (34 s) — obojí v BACKLOGu, nízká priorita pro modelování z kvádrů.
- 🆕 **Hlídač paměti** (JS): oranžový pruh při haldě ≥ 1500 MB, červený ≥ 2000 MB (fuzz test rostl na 2,7 GB za 80 s). `memwarn_win.sh` PASS; tel/perf_panel/restore/savednote/safe PASS po změně (WGPU_PERF je teď vždy zapnuté, aby hlídač dostával heap_mb). Na iPadu sleduj, zda se pruh objeví při těžké operaci (Subsurf 5+) před pádem.
- ✅ `regress_all.sh` po hlídači paměti (WGPU_PERF vždy zapnuté): 59 sekcí, **0 FAIL**.
- 🧠 **Příčina růstu paměti nalezena (`leak_win.sh`, bisekce):** není to únik, jsou to **undo kroky** — každý krok s velkým meshem drží plnou kopii (40 těžkých kroků: halda 1→3,7 GB; bez `undo_push` zůstane 1 GB). Oprava (JS/Python, bez rebuildu): výchozí **Undo Memory Limit 300 MB** (`?undomem=N`, 0 = bez limitu; mění se v Preferences ▸ System). Stejný test: halda po 61 s 1,66 GB místo 2,49 GB. undo_win / prefs_input / restore / model_ops2 PASS. Čeká na iPad.
- ✅ `regress_all.sh` po undo limitu (P83): 59 sekcí, **0 FAIL**.
- **Co otestovat na iPadu:** čisté data webu → kostka → Tab → plochy → vyber → G → prudké tažení 10+ s → potvrdit. Vydrží? Telemetrie `gpu.buf` by měla zůstat plochá (~100).

# Víkend — 24. 10. 23:50 — K3b jen rozbor
Výsledek: 🟡 Bez změny kódu a buildu (zbývalo 15 min). Čtením kódu: `wgpu_flush_buffer_frees` se přeskočí, když KTERÝKOLI kontext drží nesubmitnutý encoder (`pass_open()` = `render_pass_||encoder_`) → pravděpodobná příčina, že se při tažení buffery neuvolňují (odhad, neměřeno). Detail a další krok v BACKLOGu u K3b. Na iPadu nic nového k testování.

# Víkend — 24. 10. 23:10 — K1 + K2 hotové (cíl č. 1: rychlé tažení plochy)
Výsledek: 🟡 PC ověřeno, **iPad neotestován**.
- **Co jsem udělal:** K1 teploměr `scripts/drag_win.sh` (kostka → plocha → G → pohyby 10 s): při tažení vzniká **~1220 bufferů/s a ~23 textur/s**, živých max 172 (`docs/MEMORY.md`). K2: v `demo/src/touch.js` se pohyby prstu v režimu „trackpad“ (po G/R/S z lišty kláves) slučují na **max. 1 pohyb za 33 ms (~30/s)**; `?movecap=0` to vypne, `?movecap=50` zpomalí víc. Jen JS, žádný rebuild.
- **Důkaz:** `touch_modal`, `touch_boxsel`, `touch_loopcut`, `touch` — PASS (pad dál potvrzuje/ruší klepnutím). **Nezměřeno**, o kolik klesne buf_new/s při dotyku (drag_win používá myš, ne dotyk) → odhad: úměrně počtu pohybů, na iPadu rozhodne až test.
- **Co nefunguje / neví se:** jestli omezení pohybů stačí, aby GPU na iPadu nespadla. Pokud ne → K3 (pool bufferů, architekt první), K4 (`?lowdraw`).
- **Co otestovat na iPadu (nejdůležitější):** čistá data webu / soukromý tab → kostka → Tab → režim ploch → vyber plochu → klepni na **G** v liště → **prudce táhni prstem 10 s** přes obrazovku → klepnutím potvrď. Spadlo? Napiš po jaké době. Pro srovnání: `…/?movecap=0` (bez omezení) a `…/?movecap=66` (~15/s). Telemetrie sama přistane v `out/ipad/`.
- K5 část: autosave každých **30 s** (dřív 120), jen při změně, uložení 0,02 s (`autosave_win.sh` PASS). Chybí tlačítko „Obnovit poslední práci“ — teď se soubor `_autosave.blend` otevře ručně přes 📁.
- **K3 (pool bufferů) vyzkoušen a VRÁCEN** (nasazený build = původní, wasm + manifest obnoveny): pool snížil nové buffery jen 328→281/s. **Důležitější nález:** při plynulém tažení se buffery NEUVOLŇUJÍ (destroyed 0, živých +300/s až 3400 za 10 s) — flush se nespustí. To je pravděpodobná příčina pádu na iPadu (viz MEMORY.md). **Další krok K3b:** zjistit, proč `wgpu_any_context_recording()` při tažení stále vrací true, a flushovat častěji. Patch poolu: `out/k3_pool.patch`.
- Pozn.: build-blender má teď objekty s poolem; příští `ninja` je přeloží zpět (zdroj vrácen).

# Víkend — 24. 10. večer
Nový test `scripts/model_ops_win.sh` (UV smart project + unwrap, materiál, subdivide+merge, inset+extrude, bevel, save/reload): 7/7 PASS.
Lov chyb 24. 10. po finálním buildu (+ seedy 201/202 fuzz, 203 fuzz_obj PASS): `fuzz_win` seed 101 (281 op), `fuzz_obj_win` seed 102 (332 op), `ui_fuzz_win` (1531 akcí) — vše PASS, bez pádu. M5 netknuto (čeká na iPad telemetrii; `msmax` už v telemetrii je).
Výkon (PC, `drawtime_win.sh`): monkey subsurf3 15,6 ms/snímek, ico6 edit 19 ms, ico7 edit 33 ms (api 51 ms – nejhorší), submity 25–33, passy 73–82. Nic nepadá; skutečné úzké hrdlo se ukáže až z iPad telemetrie (`msmax`).
Výsledek: ✅ na PC — nasazený build (1 GB, 32 vláken, bez present-flush) prošel `regress_all.sh` 59 sekcí, **0 FAIL**. Na iPadu neotestováno; žádná nová iPad telemetrie (`out/ipad/tel_2026-10-24.jsonl` je z PC).
- ✅ **NAŠEL JSEM příčinu pádu `prefs_sweep`: byl to commit a36f0510 (flush destroy při present), ne POOL ani paměť.** Build bez něj: `prefs_sweep` 6/6 PASS (1 GB, 32 vláken). S ním padalo 3/5 (512 MB/32 vláken), 2/6 (1 GB/8 vláken). Fork 0fa1e2b6 (revert 1 řádku), `BLENDER_REF` aktualizován. `mem_win.sh` PASS (živých bufferů max 2901 při UV Editing, jinak 108–1300), `parity_win.sh` 0 ❌. Nasazený build = tento (uložen i v `out/bak_final/`).
- ⚠️ Oprava výše: M4 build **8 vláken + 512 MB i BEZ present-flush padá 3/4** (`out/m4b/`), takže menší pool/paměť pád taky zhoršuje (nebo jsou dvě příčiny). Spolehlivá je jen konfigurace 1 GB + 32 vláken bez present-flush (6/6). M4 zmenšení paměti **odloženo**; zdroj OOB ve vlákně při keyconfig reload neznámý (odhad: souvisí s GPU free ve vláknu).
- **Příčina „zaseknutého“ testu:** v `demo/public/manifest.json` byla velikost nového buildu, ale byl nasazen starý → wasm se rozbalil jako prázdný. Nový skript `scripts/swap_build.sh old|new` přepíná build i manifest.
- **A/B `prefs_sweep` (PC):** starý build (1 GB, 32 vláken) 5/5 PASS; **nový build (512 MB, 8 vláken) 2 PASS / 2 FAIL** (pád u `use_mouse_emulate_3_button`) → chyba je v novém nastavení paměti/vláken, ne starší. Nový build zůstává nenasazen (v `public/` je starý).
- **Varianta 1 GB + 8 vláken** (`out/m4_1g/`): taky 2 FAIL / 6 (stejný pád `mouse_emulate_3_button`) → **příčina je `PTHREAD_POOL_SIZE=8`, ne paměť**. Nasazen zůstává starý build (32 vláken, 1 GB). Dál zkusit POOL=16 nebo hledat, proč Preferences-sweep potřebuje >8 vláken (odhad: vlákno vytvořené za běhu, když je pool vyčerpaný, → OOB).

Výsledek: 🟡 23. 10. noc: M4 build (8 vláken + 512 MB) je hotový, ale **NENASAZENÝ** — v `demo/public/` je zase starý ověřený build (1 GB, 32 vláken). Důvod níže.

# Víkend — co je nového (23. 10. ~24:00)
- Ověřeno: `device.destroy()` nevolá nikdo z nás (jen knihovna emdawnwebgpu) → `lost=destroyed` je iOS (odhad: celková paměť procesu).
- M4 build: `POOL=8 INITMEM=536870912 bash scripts/link_blender_release.sh` (skript bere `INITMEM`, `OUT`). Hotový build uložen v `out/bak_m4/new.blender.js` + `new.blender.wasm.zst` (stačí zkopírovat do `demo/public/`). Starý build je v `out/bak_m4/blender.js` + `blender.wasm.zst`.
- Důkaz M4 na PC: `mem_win.sh` PASS (heap 512 MB), `parity_win.sh` bez ❌, ops 96/96, `regress_all.sh` 59 sekcí: **1 FAIL — `prefs_sweep`** (`memory access out of bounds` ve vlákně, stejná adresa vlákna 2×). Samostatně 1× PASS, 1× FAIL (≈50 %). **Neověřeno, jestli to dělá i starý build** (srovnání na starém buildu mi do termínu nedoběhlo) → nevím, zda je to chyba nového nastavení paměti. Proto jsem nový build nenasadil.
- **Další krok:** `prefs_sweep_win.sh` 3× na starém a 3× na novém buildu. Pokud starý nepadá → problém s 512 MB/8 vlákny (zkusit `INITMEM` 1 GB + `POOL=8`). Pokud padá oba → je to starší chyba, nový build nasadit a poslat na iPad.
- **Co otestovat na iPadu:** zatím nic nového (nasazený je starý build). 
- Blocked: nic.


# Sprint „iPad vydrží“ (23. 10., pátek odpoledne–večer)
Výsledek: 🟡 M0–M3 hotové a ověřené na PC; M4/M5/M6 jen částečně. **Na iPadu nic z toho neotestováno.**

**Co jsem udělal**
- ✅ **M0 telemetrie** iPad → PC: každé 2 s JSON (FPS, textury, wasm heap, **počet živých GPU bufferů/textur**, poslední vstupy a logy, adapter limity, důvod ztráty GPU) do `out/ipad/tel_<datum>.jsonl`. Důkaz: `scripts/tel_win.sh` PASS. Zapnuto samo na dev serveru v normálním prohlížeči (`?tel=0` vypne; Playwright testy ji nemají).
- ✅ **M1 měření**: `scripts/mem_win.sh` → `docs/MEMORY.md`. **Hlavní nález: Blender nezavolal `destroy()` na ŽÁDNÝ GPU buffer (0 z 10 820), po 2 minutách ~10 000 živých bufferů a uvolňoval je jen garbage collector** (Safari to dělá mnohem později než Chrome → pamět roste → iOS zabije GPU proces). Přesně hypotéza A.
- ✅ **M2 oprava**: buffery i textury se teď ničí hned po dalším odeslání příkazů (`wgpu_buffer_free`/`wgpu_texture_free`). Živých bufferů ~100 místo ~10 000 (`mem_win.sh`: 10 532 z 10 623 zničeno). Cesta byla trnitá: zničení rozbilo kreslení (UV Sphere bez povrchu, výběr), příčiny: (1) uniform arena držená shadery celou epochu, (2) flush po submitu jednoho kontextu zničil buffery rozepsané v jiném (DRW/preview kontext) — architekt to trefil. Teď `parity_win.sh` 12/17/20 PASS, `regress_all.sh` bez trvalého FAIL.
- ✅ **M3 refutováno**: DPR 2 nemění texturovou paměť (plátno se kreslí v CSS px).
- 🟡 **M4**: wasm heap je 1 GB od startu (INITIAL_MEMORY), neroste. Chrome ukazuje u celého agenta ~3,4 GB, ale to je z velké části 1 GB sdílené paměti započtené víckrát (hlavní vlákno + 2 workery) — skutečně spíš ~1,3–1,5 GB. `wasmBytes` (197 MB) se po instantiaci uvolňuje (odhad, nepotvrzeno měřením). `PTHREAD_POOL_SIZE` 8 vs 32 nic nezměnilo na měření.
- 🟡 **M6**: po 45 s bez prvního snímku se ukáže pruh s návodem („zavři tab úplně“) + tlačítko **Spustit bez ukládání** (`?safe=1`, bez OPFS) — `scripts/safe_win.sh` PASS. Lišta kláves se ukáže až když Blender kreslí (dřív překrývala úvodní obrazovku). Reload po ztrátě GPU na PC naběhne (`reload_lost_win.sh`), takže zaseknutí je asi jen iOS (odhad: zámek OPFS po mrtvém tabu).
- ⏸ **M5** (watchdog dlouhého submitu): nedělal jsem — bez iPad telemetrie by to byla jen spekulace.

**Finální gate (23. 10. 21:15, finální build):** `regress_all.sh` 59 sekcí, **0 FAIL** (dřívější flaky utf8/touch_loopcut tentokrát prošly). Navíc pruh „💾 Uloženo“ s odkazem do 📁 (`savednote_win.sh` PASS).

Extra lov chyb po finálním buildu (destroy zapnutý): `fuzz_win` seed 77, `fuzz_obj_win` seed 78, `ui_fuzz_win` seed 91 — bez pádu.

**Důkaz:** `tel_win.sh`, `mem_win.sh`, `safe_win.sh`, `reload_lost_win.sh`, `parity_win.sh` (12/17/20 + celé), `regress_all.sh` (jen utf8 a touch_loopcut spadly jednou v sekvenci, samostatně PASS; `touch_win` občas vypadne hned po jiném testu, samostatně PASS).

**První data z iPadu (23. 10. ~21:22, `out/ipad/`, Safari 26.5):** telemetrie funguje přes tunel. Adapter `apple`: `maxStorageBuffersPerShaderStage=44`, `maxBufferSize=1 GiB`, `maxStorageBufferBindingSize=1 GiB`, `maxBindGroups=11` → limit storage bufferů **není problém** (vlasy/GP by měly jít). Okno bylo 580×522 CSS px (obrazovka 954×1373, DPR 2 — asi Split View/Stage Manager). Tab byl celou dobu na pozadí (`hidden`, 157 s), Blender se nespustil (žádný `start` s framy) a skončilo `TypeError: Load failed` (zřejmě fetch při návratu z pozadí). Z toho se o pádech GPU nic nedozvíme — chci sezení, kde Blender opravdu běží.

**Nová data z iPadu (23. 10. 21:28, `python3 scripts/tel_summary.py out/ipad/tel_2026-10-23.jsonl`)** — poprvé Blender opravdu běžel (sezení `s6xhui`, `adjjbf`, `cj7010`):
- `adjjbf` (77 s, 14 FPS): `lost_reason: destroyed` ve 69 s, hned potom `Aborted(Assertion failed)`. Živých bufferů 4124 (špička 6394), `buf_destroyed` 38 423 z 42 547, `buf_gc` 0 → destroy na iPadu funguje, ale GPU se odpojila i tak. Poslední vstupy: klávesy `x`, `y`, pak klik. Důvod „destroyed“ = device zničen. `demo/src/*.js` nikde nevolá `device.destroy()` → zničil ho Safari/iOS (odhad: GPU proces zabit kvůli paměti); assertion přišla až 70 ms po ztrátě = následek, ne příčina. Pro jistotu hledat `device.destroy` ještě v C++ (`source/blender/gpu/webgpu`).
- `s6xhui` (109 s, 6 FPS): `TypeError: Type error` v `blender.js:87` ve 58 s, 3271 živých bufferů, 268 MB textur. Neprošetřeno.
- `cj7010`: `RangeError: Out of memory` po 32 s (hned po kliknutí) — wasm heap / alokace; podporuje M4 (zmenšit paměť).
- Tab byl často `hidden` (zase přepínání do pozadí).
- **Dál (odhad pořadí):** 1) potvrdit v C++, že `device.destroy()` nevolá nikdo z nás; pokud ne → je to iOS a míříme na paměť (M4); 2) `Type error` blender.js:87 (stack); 3) M4 podle `Out of memory`. Dnes už na to nezbyl čas, nic z toho jsem neopravoval.

**Co otestovat na iPadu (podle důležitosti)**
1. Na PC: `cd demo && pnpm dev --host` + `cloudflared tunnel --url http://localhost:5173`, na iPadu otevři **https** odkaz (nové okno, čistá data webu), pracuj jako obvykle až do pádu. Já pak čtu `out/ipad/tel_*.jsonl` — nic nemusíš fotit.
2. Zkus to, co dřív padalo: UV Editing (A, G, táhnout), Material Preview, Sculpt po Subsurf 2, Monkey Subsurf 3. **Vydrží to déle než ~15 s?** Napiš, kolik minut.
3. Když spadne: otevři stránku znovu → pokud visí „Loading Blender…“, po 45 s se objeví oranžový pruh. Zkus tlačítko **Spustit bez ukládání**.
4. Výběr/Add UV Sphere/Undo ve viewportu — jen ať se nic nerozbilo (kreslení bufferů se změnilo).

**Co nefunguje / otevřené**
- Nevíme, jestli ztráta GPU na iPadu byla opravdu paměť; telemetrie (`gpu.buf`, `lost_detail`) to ukáže.
- `parity #12` a pár testů je občas flaky (1 z ~5) při zapnutém destroy; baseline bez destroy nikdy nespadl. Pokud na iPadu uvidíš, že výběr „blikne“, napiš.
- Špička živých bufferů při UV Editing (~3000) než doběhne flush — ladit až s daty z iPadu.

**Co dál**: až budou data z iPadu → M5 (watchdog submitu) / M4 (zmenšit INITIAL_MEMORY, undo paměť) podle toho, co telemetrie ukáže.

# Kolo 65 (víkend, 18. 10.) — render do souboru
- ✅ **Render do souboru byl prázdný** (PNG s alpha 0): `render.render(write_still=True)`, Save As z Render Result. Web nemá synchronní čtení z GPU → zápis se teď odloží, až dorazí pixely (fork 7224a3a6). Důkaz: `scripts/render_write_win.sh` PASS (EEVEE, Workbench, Save As); ops 94/94, interactive ALL PASS, parity bez ❌, gpulost PASS.
- Testy `render_eevee_to_png` a `render_workbench_to_png` přesunuty z `ops_test.py` do `render_write_test.py` — asserty stejné, jen čekají na asynchronní čtení (zápis je teď o pár ticků později). Není to zeslabení.
- Nové ops testy: bridge/bevel, světla/kamery/text→mesh/merge, výběry/sharp/seam, atributy + Geometry Nodes (vše PASS).
- ✅ UI fuzz `scripts/ui_fuzz_win.sh` (náhodné klávesy + myš, 4 seedy × 150 s, ~1100 akcí): bez pádu, bez PAGEERROR, render loop žije. Objektový fuzz `fuzz_obj_win.sh` (modifikátory, join, sculpt/paint módy, undo): 2 seedy PASS.
- ✅ Fuzz `scripts/fuzz_win.sh` (náhodné edit-mode operace + undo/redo + přepínání módů; `FUZZ_SEED`, `FUZZ_N`): 3 seedy × ~860 operací bez pádu wasm.
- 🟡 Viewport Render (`render.opengl`) na webu teď hlásí „not supported, use F12“ místo tichého prázdného obrázku (`render_write_win.sh` PASS); skutečná oprava v BACKLOGu. Na iPadu: Render ▸ Viewport Render Image → objeví se chybová hláška.
- ✅ **Animace (Ctrl+F12) píše skutečné snímky**: web teď renderuje po jednom snímku z hlavní smyčky a čeká na čtení z GPU (fork 82ae46e8). Důkaz: `scripts/render_anim_win.sh` PASS (Workbench, EEVEE, Ctrl+F12 z UI; 3 PNG se skutečnými pixely, `regress_all.sh` ho obsahuje). Starý test `render_animation_png_sequence` (jen existence souborů) přesunut do `render_anim_test.py` se silnějšími asserty. Omezení: jen PNG/EXR sekvence, ne video; Overwrite/Placeholders se ignorují.
- Co otestovat na iPadu: Ctrl+F12 s 3 snímky (Output ▸ PNG, 64×64 stačí) → ve stavovém řádku proběhnou 3 snímky a soubory v `/opfs/home/` nejsou černé; F12 → Image ▸ Save As → PNG → 📁 stáhnout → obrázek není černý.


# Kolo 66 (víkend, 18. 10.) — lov chyb v EEVEE
- Regresní sada po všech změnách kola 66 (`regress_all.sh`, 18. 10. ~10:30): bez FAIL (+36 nových sweepů: overlay/node/eevee/modifikátory/operátory 30 modulů/Properties), WGSL seed obnoven od nuly (193 shaderů, verify 2 překlady — prelude se změnil, takže po stažení nového buildu je první spuštění jako dřív).
- ✅ Nalezeno a opraveno zamrznutí **UV ▸ Select Edge Ring / Select Overlap** (Alt+klik na hranu v UV editoru zamrzl Blender; `uv_hang_win.sh`).
- ✅ Workbench **Matcap + Cavity Curvature** se nepřekládal (celočíselné samplery) a materiály s uzlem **Wireframe** se nepřekládaly (objekt by zmizel) — opraveno (wireframe uzel kreslí zatím bez čar).
- ✅ Nový `scripts/render_features_win.sh` (11 případů, kontrola barev pixelů): emise, textura, svět, průhledný film, slunce, alpha blend, vertex color — vše PASS.
- ✅ **Objemy v EEVEE** (Volume Scatter/Absorption) se nevykreslovaly: shader `eevee_volume_scatter` se nepřeložil (`extinction_tx`). Opraveno (fork, `eevee_volume.bsl.hh`); důkaz `render_features_win.sh` volume_absorb + volume_scatter_light PASS. Na iPadu: kostka s materiálem Volume Absorption/Scatter ve vykresleném náhledu (F12) má barevný objem.
- ✅ **Grease Pencil a vlasy (Curves)**: ve viewportu se dřív vůbec nekreslily (chyběly texel buffery `samplerBuffer`, `max_buffer_texture_size`, vyplnění dummy depth textury). Teď vlasy v F12 i viewportu a GP ve viewportu fungují (`render_features_win.sh` hair_curves PASS, `out/win/gp_viewport.png`). **Na iPadu ověř:** Add ▸ Grease Pencil ▸ Monkey vidět; Add ▸ Curves ▸ Empty Hair + vlasy viditelné; hlavně nesmí spadnout (nové storage buffery — limit Safari). Lukáš: v konzoli Safari `(await navigator.gpu.requestAdapter()).limits.maxStorageBuffersPerShaderStage` a napiš číslo.\n- 🟡 GP ve F12 renderu: tahy chybí, ale zbytek scény se teď vykreslí (dřív celý obraz nulový). Ve viewportu GP funguje.
- 🟡 **Compositor** (Render ▸ Compositing) vracel prázdný/průhledný obraz. Web ho teď přeskočí s varováním a render zůstane bez kompozitingu (skutečná oprava v BACKLOGu). Na iPadu: scéna s compositing nodes → F12 → obraz je vidět + varování.

# ⭐ Co otestovat na iPadu NEJDŘÍV (nové z víkendu, podle důležitosti)
(Ověřeno jen na PC/Chrome; na iPadu nic. Pokud něco spadne, napiš přesné kroky + screenshot. Po načtení stránky udělej reload, ať se nahraje nový build.)
0. **Nové z kola 65–66 (18. 10., vše ověřeno jen na PC/Chrome):**
   - **Číslo do konzole Safari:** `(await navigator.gpu.requestAdapter()).limits.maxStorageBuffersPerShaderStage` → napiš mi ho (vlasy potřebují ≥ 11, stíny/objemy ≥ 10).
   - **Hlavně nesmí spadnout:** Preferences ▸ Input ▸ *Emulate 3 Button Mouse* zaškrtnout (dřív pád); UV Editing ▸ Alt+klik na hranu (Edge Ring) a Select ▸ Select Overlap (dřív zamrzlo).
   - **Sochání:** Sculpt mode ▸ Remesh ▸ Voxel Remesh (Ctrl+R) — dřív hlásilo chybu, teď (OpenVDB v buildu) vyrobí novou síť; Object ▸ Add ▸ Volume + Mesh to Volume.
   - **Fyzika/retopo:** Physics ▸ Rigid Body (Active kostka + Passive podlaha, Space = přehrát); Object ▸ Quad Remesh (nový od kola 66).
   - **Fluid:** Object ▸ Quick Effects ▸ Quick Smoke (malá simulace, Space) — pozor na výkon.
   - **Nově vidět:** Add ▸ Grease Pencil ▸ Monkey (tahy ve viewportu); Add ▸ Curves ▸ Empty Hair (+ vlasy); materiál s Volume Absorption/Scatter; Solid + MatCap + Cavity ▸ Curvature.
   - **Render:** Ctrl+F12 (animace, 3 snímky PNG, soubory nejsou černé); F12 ▸ Image ▸ Save As ▸ PNG nebo **TIFF**; Viewport Render hlásí „not supported“; compositor se přeskočí s varováním.
1. **Prst místo myši (kola 51–54):** vyber kostku → lišta **G** → táhni prstem (lišta zmodrá, kostka se hýbe) → klepni = potvrdit. Edit mode: **Ctrl→R→Ctrl** loop cut (najeď prstem na hranu, klepni 2×), **⋯ → B** box select tahem, **⋯ → E** extrude.
2. **Klávesnice sama (kolo 54):** dvojklepni na název objektu vpravo → vyjede klávesnice? Napiš „příšera“ — objeví se diakritika (kolo 41)? Když ne, tlačítko ⌨ v liště.
3. **Lišta ⋯ (kolo 50):** Space (přehrát), H, I, F2, 💾 Ctrl+S.
4. **UV Editing nespadne**: Tab → záložka *UV Editing* → A → G → táhnout.
5. **Záložka Material nezamrzne** (vpravo koule dole). Náhledy jsou záměrně šedé koule.
6. **File ▸ New ▸ Sculpting / 2D Animation…** (kolo 45) změní rozložení; **Add ▸ Curves ▸ Empty Hair** (kolo 43) funguje.
7. **Export do hry**: File ▸ Export ▸ glTF/FBX → `/opfs/home/test.glb` → 📁 stáhnout → otevři v Unity/desktop Blenderu. Uložení PNG z F12.
8. **Sculpt/Vertex/Weight/Texture Paint** tahem Pencilu; **Grease Pencil**.
9. První přepnutí do **Material Preview**: hláška „Kompiluji shadery…“ — kolik sekund?
10. **Ikona na ploše:** Sdílet ▸ Přidat na plochu → má logo Blenderu (kolo 55; staré zástupce smaž a přidej znovu)? Otevře se celoobrazovkově?
11. **Z plochy (celoobrazovkově):** je horní menu Blenderu (File Edit Render…) celé vidět pod hodinami a spodní lišta nad čárou dole? (kolo 56, odhad)
12. **Větší UI pro prsty (volitelné):** otevři stránku s `?uiscale=1.3` (nebo Edit ▸ Preferences ▸ Interface ▸ Resolution Scale) — líbí se ti? Panel vpravo je pak užší. Řekni, jestli to má být výchozí.
13. **Pozor na klávesy z lišty:** platí pro oblast, kam jsi naposledy klepnul (jako kurzor myši). Chceš Tab/G/E ve viewportu → nejdřív klepni do viewportu. Dává to smysl, nebo má lišta sama „skočit“ do viewportu?
14. **File ▸ Quit / Ctrl+Q** (kolo 62): dřív zamrzlý obraz bez vysvětlení; teď šedý pruh nahoře „Blender skončil … Spustit znovu". Zkus (Ctrl+Q na klávesnici) — pruh se objeví?
15. Dále stále platí seznam „Co otestovat na iPadu (podle důležitosti)“ níže (dotyk, soubory, výběr, z-fighting, `?perf=1`).

## Blocked / otevřené (poctivě)
- Z-fighting ploch: nereprodukuje se na PC, aplikovaná hypotéza čeká na iPad.
- (Voxel Remesh, Rigid Body, Quad Remesh od kola 66 fungují — OpenVDB/Bullet/Quadriflow v buildu.) Fluid (kouř/voda) od kola 66 také (Mantaflow v buildu).
- Draco/Meshopt komprese glTF, Extensions (bl_pkg), `_ctypes`/`_ssl`/`_lzma`, `import sqlite3` zavěsí.
- Kompilace pipeline při prvním Material Preview blokuje 6–7 s (jen hláška, ne oprava).

# Víkend — co je nového (17. 10., odpoledne)
- 🟡 Kolo 54 **Soft klávesnice sama**: dvojklepnutí do textového/číselného pole → klávesnice vyskočí (dřív jen tlačítko ⌨ v liště); po Esc/Enter zmizí. PC: `autokbd_win.sh` PASS, ale **iOS Safari je přísné na focus mimo klepnutí (odhad, že 1 s po klepnutí projde)**. **Na iPadu ověř:** dvojklepni na název objektu vpravo → vyjede klávesnice? Když ne, použij ⌨ jako dřív a napiš mi. Vypnout: `?autokbd=0`. Nový build (BLENDER_REF viz Makefile).
- ✅ Kolo 52–53 **Loop cut, Knife a Box select prstem**: Ctrl(sticky)+R → najeď prstem na hranu, klepni (umístí), klepni (potvrdí posun); K = knife (klepání bodů, Enter ukončí); ⋯ → B = tah prstem nakreslí výběrový box. Lišta je během režimu modrá; Esc/Enter/Tab režim zruší. PC: `touch_loopcut_win.sh`, `touch_boxsel_win.sh` PASS. **Na iPadu ověř:** v edit modu loop cut a box select podle popisu.
- ✅ Kolo 51 **G/R/S/E prstem**: po klepnutí na G/R/S/E (lišta) dřív prst orbitoval, takže posun/rotace/měřítko/extrude šly jen Pencilem. Teď lišta **zmodrá** a jeden prst funguje jako touchpad (tah = posun, klepnutí = potvrdit; Esc/Enter režim zruší). PC: `touch_modal_win.sh` PASS. **Na iPadu ověř:** vyber kostku → G → táhni prstem po viewportu (hýbe se kostka?) → klepni (potvrdí?) → prst zase otáčí pohled? Totéž E v edit modu.
- ✅ Kolo 50 **Lišta kláves: nové tlačítko ⋯** (druhá řada): E (extrude), Space (přehrát), H, I, B, C, D, F, K, M, N, P, T, Q, W, ⌫, F2, F3, ., -, /, 💾 (Ctrl+S). PC: `bar_win.sh` PASS. **Na iPadu ověř:** po načtení stránky (reload) klepni ⋯ — objeví se druhá řada? Funguje E v edit modu, Space na timeline? (Lištu ovládáš prstem, nepřekáží viewportu?)
- ✅ Kolo 45 **File ▸ New ▸ šablony** (2D Animation, Sculpting, Storyboarding, VFX, Video Editing) dřív nedělaly nic (soubory šablon chyběly). Teď se načtou (PC: `templates_win.sh` PASS). **Na iPadu ověř:** File ▸ New ▸ Sculpting — změní se rozložení? (první přepnutí může kompilovat shadery několik sekund.)
- ✅ Kolo 43 **Vlasy (Curves ▸ Empty Hair)** padaly na chybějících assetech — doplněno (PC: `ops_win.sh` 88/88). **Na iPadu ověř:** Add ▸ Curves ▸ Empty Hair → vznikne objekt bez chyby. Známá mezera: Physics ▸ Fluid (kouř/voda) není v buildu.
- ✅ Kolo 41 **Háčky a čárky při psaní**: znaky mimo ASCII (ř, š, ž, é, €…) se v Blenderu zahazovaly a klávesy bez kódu z iPad soft klávesnice taky. Teď se píšou (PC: `utf8_win.sh` PASS, `regress_all.sh` bez FAIL). **Na iPadu ověř:** ⌨ v liště → dvojklik na název objektu v Outlineru → napiš „příšera“ (+ případně Ctrl+A v poli smaže?) — objeví se diakritika? Novinka: nový build blender.wasm (BLENDER_REF 9e618cf5).
- 🟡 Kolo 40 (odhad): plátno používalo `100vh` — na iPad Safari je to výška bez lišty, takže spodek Blenderu mohl být schovaný / plátno roztažené. Změněno na `100dvh`. Na PC nic nemění. **Na iPadu ověř:** je celá spodní lišta Blenderu (timeline, verze vpravo dole) vidět při zobrazené liště Safari? Je obraz ostrý a neroztažený?

- ✅ Kolo 39 **Gizmo prstem**: ikony ruka/lupa/kamera vpravo nahoře ve 3D viewportu i tahací šipky (Move/Rotate/Scale) šly dřív ovládat jen Pencilem — prst vždy orbitoval. Teď tah prstem začatý na gizmu táhne gizmo. PC: `gizmo_touch_win.sh` PASS (ruka = pan), `gizmo_move_win.sh` PASS (šipka Move), `touch_win.sh` ALL PASS. **Na iPadu ověř:** prstem táhni za ikonu ruky (posun) a lupy (zoom); vyber objekt, vyber nástroj Move (T-lišta vlevo) a táhni za šipku — táhne se objekt? Táhnutí mimo gizmo pořád otáčí.

- ✅ Kolo 37 **Odkazy z Blenderu** (Help ▸ Manual, Python API…): nic se neotevíralo. Teď se otevře nová karta (PC: `urlopen_win.sh` PASS). **Na iPadu ověř:** Help ▸ Manual — otevře se dokumentace? (Safari může blokovat vyskakovací okno → povol.)

- ✅ Kolo 36 **Preferences se pamatují**: UI scale, navigace, zkratky, motiv… se dřív po každém načtení stránky vracely na výchozí. Teď se ukládají (do ~5 s po změně) a při startu načítají. PC: `prefsave_win.sh` PASS. **Na iPadu ověř:** Edit ▸ Preferences ▸ Interface ▸ Resolution Scale změň (např. 1.3), počkej 10 s, obnov stránku → zůstalo? Kdyby se něco pokazilo: otevři stránku s `?resetprefs=1`.

- ✅ Kolo 35 **Schránka (Ctrl+C / Ctrl+V)**: nefungovala vůbec (kopírování hodnot, textu v Text Editoru, Python konzole). Teď funguje uvnitř Blenderu i ven/dovnitř přes systémovou schránku (PC: `clip_win.sh` PASS). **Na iPadu ověř (klávesnice/lišta):** v Text Editoru napiš text, vyber, Ctrl+C, Ctrl+V; najeď na číslo v panelu vlastností, Ctrl+C a Ctrl+V na jiné pole; zkopíruj text z Poznámek a vlož do Python konzole (Cmd+V). Safari může ukázat bublinu „Vložit“.

- ✅ Kolo 34 **Zaseknutý Shift/Ctrl**: když okno ztratí fokus (přepnutí aplikace) při držené klávese, Blender ji měl „stále stisknutou“. Teď se při ztrátě fokusu pošle uvolnění (`blur_win.sh` PASS, `interactive_win.sh` ALL PASS). Na iPadu relevantní jen s externí klávesnicí.

- ✅ Kolo 33 **Ztráta GPU**: když iPad GPU odebere (málo paměti, přepnutí aplikace), plátno dřív tiše zamrzlo. Teď červený pruh nahoře „GPU se odpojila… Obnovit“ (+ odkaz na autosave). PC: skutečný pád GPU procesu → banner (`gpulost_win.sh` PASS). Nový build blender.wasm (BLENDER_REF 6f1b18e6). **Na iPadu:** nic zvláštního; pokud pruh uvidíš, napiš, co jsi dělal.

- ✅ Kolo 32 **Autosave** (ochrana proti ztrátě práce, když iPad zabije tab na pozadí): Blenderův autosave na webu nezapisoval nic. Teď každé 2 min (jen pokud je scéna změněná) zápis `/opfs/home/_autosave.blend` (📁 → stáhnout / File ▸ Open `/opfs/home/_autosave.blend`). Starý se při startu uloží jako `_autosave_prev.blend`. PC: `autosave_win.sh` PASS. **Na iPadu ověř:** uprav scénu, počkej 2 min, 📁 → je tam `_autosave.blend`? Přepni na jinou appku a zpět / obnov stránku → otevři soubor.

- Kolo 31: otočení iPadu / změna velikosti okna ověřeno na PC (`resize_win.sh` PASS, DPR 2). Opravena nezachycená chyba při každém resize (`fitCanvas`). **Na iPadu ověř:** otoč iPad naležato/na výšku — layout se přeloží? Je UI dost ostré (odhad: kreslí se v 1× rozlišení, ne Retina)?

- Kolo 30 (noc): `ops_win.sh` teď 81 testů, všechny PASS (nově multires, Remesh Blocks, sekvencer). Cycles v buildu není (jen EEVEE/Workbench) — známá mezera, ne chyba.

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
