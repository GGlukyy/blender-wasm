#!/usr/bin/env bash
# FFTW 3.3.10 (GPL-2.0+) → wasm-sysroot: libfftw3f (float), libfftw3 (double), libfftw3f_threads.
# Blender chce všechny tři (FindFftw3.cmake). Bez SIMD (wasm), vlákna přes pthread (Blender stejně nastaví TBB callback).
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"

src=$(fetch_extract "https://www.fftw.org/fftw-3.3.10.tar.gz" "fftw-3.3.10.tar.gz" "fftw-3.3.10")
for prec in float double; do
  b="$BLD/fftw3-$prec"; rm -rf "$b"; mkdir -p "$b"; cd "$b"
  extra=""; [ "$prec" = float ] && extra="--enable-float --enable-threads"
  CFLAGS="$WASM_CFLAGS" emconfigure "$src/configure" --prefix="$SYSROOT" --disable-shared --enable-static \
    --disable-fortran --disable-doc --with-our-malloc $extra
  emmake make -j"$NPROC"
  emmake make install
done
rm -f "$SYSROOT"/lib/libfftw3*.la
log "done"
