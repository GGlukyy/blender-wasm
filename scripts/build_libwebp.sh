#!/usr/bin/env bash
# libwebp 1.6.0 (BSD-3-Clause, verze jako Blender 5.3 versions.cmake) → wasm-sysroot: libwebp, libsharpyuv, libwebpdemux, libwebpmux.
# Blender (format_webp.cc, WITH_IMAGE_WEBP) je najde přes FindWebP.cmake. Bez SIMD/threads/nástrojů.
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract "https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.6.0.tar.gz" \
  "libwebp-1.6.0.tar.gz" "libwebp-1.6.0")
em_cmake "$src" libwebp \
  -DWEBP_BUILD_ANIM_UTILS=OFF -DWEBP_BUILD_CWEBP=OFF -DWEBP_BUILD_DWEBP=OFF -DWEBP_BUILD_GIF2WEBP=OFF \
  -DWEBP_BUILD_IMG2WEBP=OFF -DWEBP_BUILD_VWEBP=OFF -DWEBP_BUILD_WEBPINFO=OFF -DWEBP_BUILD_WEBPMUX=OFF \
  -DWEBP_BUILD_EXTRAS=OFF -DWEBP_BUILD_LIBWEBPMUX=ON -DWEBP_ENABLE_SIMD=OFF -DWEBP_USE_THREAD=OFF \
  -DWEBP_BUILD_FUZZTEST=OFF
ninja -C "$BLD/libwebp" install
log "done"
