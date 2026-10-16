Výsledek: ✅ P0 hotové (build na PC + demo běží na iPadu)

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
