#!/usr/bin/env bash
# GMP 6.3.0 (stejná verze jako Blender) -> wasm-sysroot, bez asm, s C++ (gmpxx). H35: Exact boolean. m4 lokálně, když v systému není.
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
if ! command -v m4 >/dev/null; then
  if [ ! -x "$BLD/m4-host/bin/m4" ]; then
    m4src=$(fetch_extract "https://ftp.gnu.org/gnu/m4/m4-1.4.19.tar.xz" "m4-1.4.19.tar.xz" "m4-1.4.19")
    ( cd "$m4src" && env -u CC -u CXX ./configure --prefix="$BLD/m4-host" >/dev/null && make -j"$NPROC" >/dev/null && make install >/dev/null )
  fi
  export PATH="$BLD/m4-host/bin:$PATH"
fi
src=$(fetch_extract "https://gmplib.org/download/gmp/gmp-6.3.0.tar.xz" "gmp-6.3.0.tar.xz" "gmp-6.3.0")
echo "956dc04e864001a9c22429f761f2c283  $(ls "$DL"/gmp-6.3.0.tar.xz 2>/dev/null)" | md5sum -c -
b="$BLD/gmp"; rm -rf "$b"; mkdir -p "$b"; cd "$b"
CC_FOR_BUILD=gcc CFLAGS="-O2 $WASM_CFLAGS" CXXFLAGS="-O2 $WASM_CXXFLAGS" emconfigure "$src/configure" --host=none --prefix="$SYSROOT" --disable-assembly --enable-cxx --enable-static --disable-shared
emmake make -j"$NPROC"
emmake make install
ls -la "$SYSROOT/lib/libgmp.a" "$SYSROOT/lib/libgmpxx.a" "$SYSROOT/include/gmp.h" "$SYSROOT/include/gmpxx.h"
