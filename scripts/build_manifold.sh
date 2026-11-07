#!/usr/bin/env bash
# Manifold v3.4.1 (stejná verze a volby jako Blender, jen bez TBB paralelismu) -> wasm-sysroot. H35: solver Manifold.
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract "https://github.com/elalish/manifold/archive/refs/tags/v3.4.1.tar.gz" "Manifold-v3.4.1.tar.gz" "manifold-3.4.1")
echo "1fd7e7741cae23db2956159d42ea7017  $DL/Manifold-v3.4.1.tar.gz" | md5sum -c -
b="$BLD/manifold"; rm -rf "$b"
emcmake cmake -S "$src" -B "$b" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$SYSROOT" \
  -DCMAKE_C_FLAGS="$WASM_CFLAGS" -DCMAKE_CXX_FLAGS="$WASM_CXXFLAGS" \
  -DMANIFOLD_JSBIND=OFF -DMANIFOLD_CBIND=OFF -DMANIFOLD_PYBIND=OFF -DMANIFOLD_PAR=OFF -DMANIFOLD_CROSS_SECTION=OFF \
  -DMANIFOLD_EXPORT=OFF -DMANIFOLD_DEBUG=OFF -DMANIFOLD_TEST=OFF -DMANIFOLD_DOWNLOADS=OFF -DTRACY_ENABLE=OFF -DBUILD_SHARED_LIBS=OFF
ninja -C "$b" -j"$NPROC"
ninja -C "$b" install
# Pro Emscripten Manifold hlavičky a cmake config neinstaluje (jeho CMakeLists končí dřív): ručně, Blender hledá target manifold::manifold.
mkdir -p "$SYSROOT/include/manifold" "$SYSROOT/lib/cmake/manifold"
cp -r "$src/include/manifold/." "$SYSROOT/include/manifold/"
cat > "$SYSROOT/lib/cmake/manifold/manifoldConfig.cmake" <<CFG
if(NOT TARGET manifold::manifold)
  add_library(manifold::manifold STATIC IMPORTED)
  set_target_properties(manifold::manifold PROPERTIES IMPORTED_LOCATION "$SYSROOT/lib/libmanifold.a" INTERFACE_INCLUDE_DIRECTORIES "$SYSROOT/include")
endif()
CFG
ls -la "$SYSROOT/lib/libmanifold.a"; ls "$SYSROOT/include/manifold"
