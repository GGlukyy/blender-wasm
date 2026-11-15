#!/bin/bash
# C1: PC varianta s Cycles (blender-pc.wasm). Viz docs/CYCLES.md. Použití: scripts/cycles_pc_build.sh   (build-5.3 musí být strom S Cycles — jinak ho nejdřív přepni, viz CYCLES.md)
# Výstup: out/pubcyc/ (blender.js + blender.wasm.zst = PC varianta; v demo/public se jmenují blender-pc.js / blender-pc.wasm.zst a manifest.json má oba klíče)
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"; export PATH=$ROOT/emsdk/upstream/emscripten:$PATH
cmake -DWITH_CYCLES=ON -DWITH_CYCLES_OSL=OFF -DWITH_CYCLES_PATH_GUIDING=OFF -DWITH_EMBREE=OFF -DWITH_NANOVDB=OFF \
  -DWITH_CYCLES_DEVICE_CUDA=OFF -DWITH_CYCLES_DEVICE_OPTIX=OFF -DWITH_CYCLES_DEVICE_HIP=OFF -DWITH_CYCLES_DEVICE_HIPRT=OFF -DWITH_CYCLES_DEVICE_ONEAPI=OFF \
  -DWITH_CYCLES_CUDA_BINARIES=OFF -DWITH_CYCLES_HIP_BINARIES=OFF -DWITH_CYCLES_ONEAPI_BINARIES=OFF -DWITH_CYCLES_NATIVE_ONLY=OFF \
  -DWITH_CYCLES_STANDALONE=OFF -DWITH_CYCLES_HYDRA_RENDER_DELEGATE=OFF build-5.3
ninja -C build-5.3 -j12 blender || true   # cmake link selže na wasmfs/bz2 symbolech (normální), link dělá .link53.sh
mkdir -p out/pubcyc; OUT=$ROOT/out/pubcyc bash scripts/.link53.sh
