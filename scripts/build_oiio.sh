#!/usr/bin/env bash
# OpenImageIO v3.1.13.1 → wasm-sysroot. Minimal: only PNG/JPEG/OpenEXR readers,
# no tools/tests/python/GL, no optional format libs we didn't cross-compile.
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract \
  "https://github.com/AcademySoftwareFoundation/OpenImageIO/archive/refs/tags/v3.1.13.1.tar.gz" \
  "OpenImageIO-v3.1.13.1.tar.gz" "OpenImageIO-3.1.13.1")

# OIIO's platform detection keys on __linux__, which emscripten does not define
# (it defines __EMSCRIPTEN__). Emscripten's libc is musl-like and provides the
# needed APIs (unistd, usleep, isatty, strcasecmp_l), so treat emscripten as
# Linux throughout. Idempotent via sentinel.
if [ ! -f "$src/.wasm_linux_patched" ]; then
  grep -rlZ '__linux__' "$src/src" | xargs -0 --no-run-if-empty sed -i \
    -e 's/defined(__linux__)/(defined(__linux__) || defined(__EMSCRIPTEN__))/g'
  grep -rlZ '#ifdef __linux__' "$src/src" | xargs -0 --no-run-if-empty sed -i \
    -e 's/#ifdef __linux__/#if defined(__linux__) || defined(__EMSCRIPTEN__)/g'
  touch "$src/.wasm_linux_patched"
fi

# ustring's libc++ hack (forces std::string internals to point at the table chars)
# is wrong for current emscripten libc++: ustring::string() came back EMPTY for
# strings >= 11 chars (e.g. "ResolutionUnit"), so PNG saving failed with
# "tEXt: invalid keyword". Fall back to the plain std::string copy. Idempotent.
if [ ! -f "$src/.wasm_ustring_patched" ]; then
  sed -i 's/#elif defined(_LIBCPP_VERSION) \&\& !defined(__aarch64__)/#elif defined(_LIBCPP_VERSION) \&\& !defined(__aarch64__) \&\& !defined(__EMSCRIPTEN__)/' "$src/src/libutil/ustring.cpp"
  grep -q '__aarch64__) && !defined(__EMSCRIPTEN__)' "$src/src/libutil/ustring.cpp"
  touch "$src/.wasm_ustring_patched"
fi

# libdpx: `pixels * -3 * bytes` with size_t pixels — on wasm32 (32-bit size_t) this is a huge POSITIVE
# number instead of a negative "convert in place" marker → vector::resize throws length_error and reading
# any RGB/RGBA DPX kills the thread (28. 11., scripts/v2_formats_win.sh). Do the math in int64. Idempotent.
if [ ! -f "$src/.wasm_dpx_patched" ]; then
  sed -i 's/return pixels \* \(-\?[0-9]\) \* bytes;/return int64_t(pixels) * \1 * int64_t(bytes);/' "$src/src/dpx.imageio/libdpx/DPXColorConverter.cpp"
  grep -q 'int64_t(pixels) \* -3 \* int64_t(bytes)' "$src/src/dpx.imageio/libdpx/DPXColorConverter.cpp"
  touch "$src/.wasm_dpx_patched"
fi

em_cmake "$src" oiio \
  -DCMAKE_CXX_STANDARD=17 \
  -DLINKSTATIC=ON \
  -DOIIO_BUILD_TESTS=OFF \
  -DOIIO_BUILD_TOOLS=OFF \
  -DBUILD_DOCS=OFF \
  -DINSTALL_DOCS=OFF \
  -DUSE_PYTHON=OFF \
  -DUSE_QT=OFF \
  -DUSE_OPENGL=OFF \
  -DUSE_FREETYPE=OFF \
  -DUSE_OPENCV=OFF \
  -DUSE_TBB=OFF \
  -DUSE_BZIP2=OFF \
  -DBUILD_MISSING_DEPS=OFF \
  -DBUILD_MISSING_ROBINMAP=OFF \
  -DBUILD_MISSING_FMT=OFF \
  -DSTOP_ON_WARNING=OFF \
  -DENABLE_PNG=ON \
  -DENABLE_JPEG=ON \
  -DENABLE_OpenEXR=ON \
  -DENABLE_TIFF=ON -DTIFF_ROOT="$SYSROOT" -DTIFF_INCLUDE_DIR="$SYSROOT/include" -DTIFF_LIBRARY="$SYSROOT/lib/libtiff.a" -DENABLE_GIF=OFF -DENABLE_FFMPEG=OFF -DENABLE_HEIF=OFF \
  -DENABLE_Raw=OFF -DENABLE_WebP=OFF -DENABLE_OpenJPEG=OFF -DENABLE_Ptex=OFF \
  -DENABLE_DICOM=OFF -DENABLE_Field3D=OFF -DENABLE_OpenVDB=OFF -DENABLE_DDS=OFF \
  -DENABLE_R3DSDK=OFF -DENABLE_Nuke=OFF -DENABLE_LIBHEIF=OFF \
  -DENABLE_BZip2=OFF -DENABLE_Libsquish=ON
log "done"
