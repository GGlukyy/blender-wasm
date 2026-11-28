#!/usr/bin/env bash
# libharu 2.4.5 (zlib/libpng licence, verze jako Blender 5.3 versions.cmake) → wasm-sysroot/lib/libhpdf.a.
# Grease Pencil ▸ Export ▸ PDF (WITH_HARU, F6). Závisí na zlib + libpng (už v sysrootu).
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract "https://github.com/libharu/libharu/archive/refs/tags/v2.4.5.tar.gz" "libharu-2.4.5.tar.gz" "libharu-2.4.5")
em_cmake "$src" libharu -DBUILD_SHARED_LIBS=OFF -DLIBHPDF_SHARED=OFF -DLIBHPDF_STATIC=ON -DLIBHPDF_EXAMPLES=OFF \
  -DZLIB_ROOT="$SYSROOT" -DPNG_ROOT="$SYSROOT" -DMATH_LIB=m -DM_LIB=m  # emscripten má libm v libc; find_library ho nenajde
log "done"
