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
