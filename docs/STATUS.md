Výsledek: 🟡 P2 částečně (hrany + vykreslení 3D kurzoru opraveno, body a „propadání“ kurzoru ne)

## P2 depth — co jsem zjistil a udělal (16. 10. 2026)
- **Hypotéza z PLAN.md (depth range [-1,1] vs [0,1]) byla špatně.** Backend už dělá `z=(z+w)*0.5` ve vertex stage (jako Vulkan), stencil reference taky. Test: edit-mesh overlay bez depth testu → hrany pořád nejsou vidět ⇒ není to depth.
- **Skutečná příčina hran i neviditelného 3D kurzoru:** `webgpu_shader_interface.cc` nenastavoval `ssbo_attr_mask_` pro `info.geometry_resources_` (Vulkan/GL ano). `GPU_batch_bind_as_resources()` se hned vracel → index buffer a atributy `draw_expand` shaderů (edit mesh edge, 3D cursor) zůstaly nenabindované → samé nuly → degenerované trojúhelníky.
- **Oprava:** 10 řádků v `webgpu_shader_interface.cc` (+ čísla vertexů/instancí v logu `WGPU_LOG_DRAW`). Commit `fb68b6a6` ve forku `GGlukyy/blender`, větev `ipad`; `BLENDER_REF` v Makefile aktualizován.
- Gessa tohle neřeší (jiná architektura) → nic nepřebíráno.

## Důkaz
- `scripts/p2_win.sh` + `scripts/p2_edit_test.mjs`: test běží ve **Windows Chrome** (skutečná GPU) z WSL přes `node.exe`; screenshoty v `out/win/` (`p2_base_*` před, `p2_fix1_*` po). Před: v edit modu vidět jen oranžové plochy; po: oranžové hrany + 3D kurzor viditelný.
- Headless/headed Chrome ve WSL (SwiftShader) vykreslí canvas bíle → pro screenshoty nepoužitelné.

## Co nefunguje
- **Vrcholy (body) v edit modu pořád nejsou vidět.** Příčina: point→quad expanze v `webgpu_batch.cc` se zapíná jen pro NEindexované kresby (`elem_()==nullptr`); `overlay_edit_mesh_vert` kreslí indexovaně (8 vrcholů, `expand=0`) → 1px body.
- **3D kurzor pořád „propadá“** (Cursor tool/Shift+PMB klik na stěnu → kurzor skončí uvnitř kostky, ověřeno pohledem shora). Příčina: `WebGPUFrameBuffer::read(GPU_DEPTH_BIT)` záměrně vrací všude 1.0 (sync readback bez JSPI nejde). Oprava = asynchronní čtení hloubky → konzultováno s architektem (viz níže).
- Celý edit mode při pohledu zblízka: hrany v X-Ray/Wireframe jsem zvlášť nezkoušel.

## Co otestovat na iPadu / ve Windows Chrome
1. Edit mode (Tab) na výchozí kostce, `A` (vybrat vše): **oranžové hrany by měly být vidět** (tečky vrcholů ještě ne).
2. Toolbar vlevo: nástroj Cursor, klik na kostku: **3D kurzor (červeno-bílý terč) by měl být vidět** (v objektovém módu i po otočení). Že propadne skrz povrch je známé.
3. Při čisté cache: iPad Nastavení → Safari → Data webových stránek, nebo soukromý panel.

## Co dál
- Architekt: návrh asynchronního čtení hloubky (3D kurzor) a bodů přes index buffer (vrcholy).
- Pak: přenést 1× parity test (krok A) — mám funkční Windows-Chrome harness.

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
