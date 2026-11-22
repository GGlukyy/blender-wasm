# CYCLES.md — měření C0 (28. 10. 2026, jen měření, `master` bez změny)

**Otázka:** kolik by stálo zapnout Cycles (CPU) v našem Blenderu na webu.

## Co jsem změřil
- **Standalone Cycles se do wasm přeloží** (`make cycles`, `build-cycles/`, `cmake/cycles-wasm-cache.cmake`; Embree, OSL, OpenVDB, path guiding vypnuté, TBB zapnuté). 171 build kroků, bez chyby.
- **Velikost:** `cycles.wasm` = 14,7 MB nekomprimovaně, **4,4 MB zstd**. To je samotné jádro Cycles (bez Blender integrace, bez GPU kernelů). Náš `blender.wasm.zst` má 25,3 MiB (198 MiB nekomprimovaně) → Cycles by přidal zhruba +4–5 MB ke stažení (odhad; integrace `intern/cycles/blender` + `WITH_CYCLES=ON` v `build-blender` přidá ještě něco).
- **Spuštění:** `node build-cycles/bin/cycles.js --help` končí `Aborted(OOM)` (INITIAL_MEMORY 512 MB / MAX 2 GB v `scripts/link_cycles_web.sh`, pthread build v nodu). Důvod jsem nezkoumal.

## Neměřeno (nedodělat bez Lukášova pokynu)
- (b) čas CPU renderu kostky 64 samples vs desktop — nespustilo se (OOM výše; chtělo by buď větší INITIAL_MEMORY, nebo běh v Chrome přes `scripts/verify.mjs`).
- Plná integrace: `build-blender` má `WITH_CYCLES=OFF`; zapnutí = nový configure + hodiny buildu + úpravy linku. Nezkoušeno.

## Závislosti (c)
- Chybí/vypnuté: Embree (BVH je pak vestavěné — pomalejší), OSL (žádné OSL uzly), OpenVDB v Cycles, OpenImageDenoise (denoiser nebude), path guiding.
- Jsou: TBB, OpenImageIO (z deps), OpenSubdiv.

## Závěr
Technicky schůdné (překládá se, +~5 MB), ale na iPadu zbytečné pro současný cíl (modelování malých assetů; paměťový strop ~5 GB WebContent už teď řeší MP). Doporučení: nechat na později, nejdřív stabilní Material Preview.


# C1 — Cycles (CPU) v PC verzi (15. 11. 2026) — ADR + výsledky
**Rozhodnutí (architect):** zvlášť `blender-pc.wasm` s Cycles jen pro PC (Chrome, Mac Safari). iPad dál dostává `blender.wasm` bez Cycles (Cycles tam není v nabídce). Loader (`wasmName()` v `demo/src/main.js`) vybírá podle zařízení, `?cycles=1|0` přepíše. Assety (`assets.tar.zst`) jsou společné, obsahují Cycles add-on (`addons_core/cycles`), iPad build ho při startu stejně odebere (`wm_files.cc`).

**Jak se to staví (bez celého rebuildu, ~15 min místo 5 h):**
1. `cp -a build-5.3 build-5.3-ipad` (záloha stromu bez Cycles; ccache tu není a ninja příkazy mají absolutní cesty, takže kopie na jiné cestě = přeložit vše).
2. `PATH=$PWD/emsdk/upstream/emscripten:$PATH cmake <flagy> build-5.3` (v adresáři, NE `-B`): `-DWITH_CYCLES=ON -DWITH_CYCLES_OSL=OFF -DWITH_CYCLES_PATH_GUIDING=OFF -DWITH_EMBREE=OFF -DWITH_NANOVDB=OFF -DWITH_CYCLES_DEVICE_{CUDA,OPTIX,HIP,HIPRT,ONEAPI}=OFF -DWITH_CYCLES_{CUDA,HIP,ONEAPI}_BINARIES=OFF -DWITH_CYCLES_NATIVE_ONLY=OFF -DWITH_CYCLES_STANDALONE=OFF -DWITH_CYCLES_HYDRA_RENDER_DELEGATE=OFF`. `ninja -n blender` = 917 kroků (jen cycles + pár souborů s `#ifdef WITH_CYCLES`).
3. `ninja -C build-5.3 -j12 blender` (cmake link selže na wasmfs/bz2 symbolech = normální, link dělá `scripts/.link53.sh`), pak `OUT=$PWD/out/pubcyc bash scripts/.link53.sh`.
4. Jaký strom je v `build-5.3`: `grep WITH_CYCLES:BOOL build-5.3/CMakeCache.txt`. **Aktuálně (22. 11. 19:00) je v `build-5.3` strom BEZ Cycles (lean/iPad) a strom S Cycles je `build-cycles53`** (dřív to bylo obráceně; vždy zkontroluj `grep WITH_CYCLES:BOOL build-5.3/CMakeCache.txt`), bez Cycles je `build-5.3-ipad` (pro další iPad build: `mv build-5.3 build-cycles53 && mv build-5.3-ipad build-5.3`, a obráceně). Nikdy nepřekládat strom na jiné cestě.

**C++ (fork `ipad-5.3`, a318e1bd, f28e6325):** (a) `session.cpp`: F12 (bez 3D pohledu) nevytváří display driver (volal by GPU ze session vlákna); (b) WebGPU backend: `WebGPUFence` a `WebGPUPixelBuffer` (CPU paměť) místo `nullptr`, `update_sub(pixbuf)` implementováno; (c) `display_driver.cpp`: na webu session vlákno jen píše do CPU pixel bufferu pod `web_lock_`, textura se tvoří a nahrává v `draw()` na hlavním vlákně.

**Důkaz (Chrome, PC):**
- `scripts/cycles_win.sh` (F12, výchozí kostka, 64 samples 960×540, bez denoise): `engine_after CYCLES`, PNG uložen, **průměr pixelů 0.2662/0.2662/0.2663 = desktop 5.3.0 (`scripts/cycles_desktop.sh`), mřížka 16×9 se shoduje (max rozdíl 0.0)**. Čas: web 2,1 s, desktop 1,1 s (kostka, 16 vláken).
- `CYC_PY=cycles_rendered_test.py scripts/cycles_win.sh`: Rendered náhled s Cycles 12 s bez chyby, screenshot `out/win/cyc_rendered.png` („Rendering Done“, kostka osvětlená).
- Velikost: `blender-pc.wasm.zst` 29,8 MB (+1,5 MB proti 28,3), rozbalený 237,4 MB (+9 MB).
- Paměť po startu v `?webkit_sim=1&ipad=1` (`b3j_win.sh`, 30 s): bez Cycles renderer_priv 2527 MB / ws 1659; s Cycles (`&cycles=1`) 2552 / 1687 = **+25 MB (< 50 MB)**. Podle zadání by tedy šel jeden společný wasm; zatím nechávám dvě varianty (iPad beze změny, neověřitelné bez iPadu). K úvaze později.

**Známá omezení / nedodělky:** v Rendered náhledu je pozadí černé místo tmavě šedé světa (F12 má správně); náhledy materiálů s Cycles renderují synchronně (UI na chvíli stojí); bez Embree/OIDN/OSL (žádný denoiser v Cycles, OSL uzly nejdou); skalární CPU kernel (SIMD tu CMake nenašel).
