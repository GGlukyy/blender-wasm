#!/usr/bin/env bash
# numpy 2.3.4 → wasm-sysroot, STATIC (no dlopen in our link). Needed by the FBX and glTF
# exporters. Plan (architect, 17. 10.): cross-compile with numpy's vendored meson; emsdk 6
# treats `-shared` as SIDE_MODULE, so we pass -sFAKE_DYLIBS=1 and get relocatable objects;
# all extension modules are packed into libnumpy_static.a and registered in CPython's
# inittab by numpy_inittab.o (a constructor), linked by scripts/link_blender_*.sh.
# Python files go to wasm-sysroot/lib/python3.13/site-packages/numpy (copied into assets).
# Cross-file values: numpy PR #24603 / pyodide numpy recipe (see docs/THIRD_PARTY.md).
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract \
  "https://github.com/numpy/numpy/releases/download/v2.3.4/numpy-2.3.4.tar.gz" \
  "numpy-2.3.4.tar.gz" "numpy-2.3.4")
T="$BLD/numpy-tools"; B="$BLD/numpy"; mkdir -p "$T"
NATIVE_PY="$BLD/python-native/python"

# Cython (pure-python wheel) run by the system python3.
if [ ! -d "$T/cython-pkg/Cython" ]; then
  url=$(curl -s https://pypi.org/pypi/Cython/json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print([u['url'] for u in d['urls'] if u['filename'].endswith('py3-none-any.whl')][0])")
  curl -fL -o "$T/cython.whl" "$url"
  mkdir -p "$T/cython-pkg"; ( cd "$T/cython-pkg" && python3 -m zipfile -e ../cython.whl . )
fi
cat > "$T/cython" <<EOF
#!/bin/sh
PYTHONPATH="$T/cython-pkg" exec python3 -m cython "\$@"
EOF
chmod +x "$T/cython"

# "python" for meson: the host (native) CPython of the same version, but answering
# sysconfig queries with the emscripten sysconfigdata (include dir, EXT_SUFFIX...).
mkdir -p "$T/sysconfig"
cp "$SYSROOT/lib/python3.13/_sysconfigdata__emscripten_wasm32-emscripten.py" "$T/sysconfig/"
cat > "$T/python" <<EOF
#!/bin/sh
_PYTHON_SYSCONFIGDATA_NAME=_sysconfigdata__emscripten_wasm32-emscripten PYTHONPATH="$T/sysconfig:$T/cython-pkg" exec "$NATIVE_PY" "\$@"
EOF
chmod +x "$T/python"

cat > "$T/cross.txt" <<EOF
[binaries]
c = 'emcc'
cpp = 'em++'
ar = 'emar'
strip = 'emstrip'
cython = '$T/cython'
python = '$T/python'
pkg-config = 'false'

[host_machine]
system = 'emscripten'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'

[properties]
needs_exe_wrapper = true
longdouble_format = 'IEEE_QUAD_LE'
skip_sanity_check = true

[built-in options]
c_args = [$(for f in $WASM_CFLAGS -Wno-return-type -I$SYSROOT/include/python3.13; do printf "'%s'," "$f"; done)]
cpp_args = [$(for f in $WASM_CXXFLAGS -Wno-return-type -I$SYSROOT/include/python3.13; do printf "'%s'," "$f"; done)]
c_link_args = ['-pthread', '-sFAKE_DYLIBS=1']
cpp_link_args = ['-pthread', '-sFAKE_DYLIBS=1']
EOF

cat > "$T/native.txt" <<EOF
[binaries]
cython = '$T/cython'
EOF

rm -rf "$B"
log "meson setup"
( cd "$src" && python3 vendored-meson/meson/meson.py setup "$B" . \
    --cross-file "$T/cross.txt" --native-file "$T/native.txt" --buildtype=release \
    -Dallow-noblas=true -Dblas=none -Dlapack=none \
    -Dcpu-baseline=none -Dcpu-dispatch=none )
log "ninja"
ninja -C "$B" -j"$NPROC"
log "install python files"
rm -rf "$B/dest"
( cd "$src" && python3 vendored-meson/meson/meson.py install -C "$B" --destdir "$B/dest" --tags runtime,python-runtime >/dev/null )

# ---- packaging: static archive + inittab registration object + python files ----
PKG="$B/dest/usr/local/lib/python3.13/site-packages/numpy"
OBJS="$B/static-objs"; rm -rf "$OBJS"; mkdir -p "$OBJS"
INITTAB="$B/numpy_inittab.c"
{
  echo '#include <Python.h>'
  tabentries=""
  for so in $(cd "$PKG" && find . -name '*.so' | sort); do
    rel="${so#./}"; mod="numpy.$(echo "${rel%%.cpython-*}" | tr / .)"
    short="${mod##*.}"
    case "$short" in *_tests|_simd|_examples) continue;; esac
    cp "$PKG/$rel" "$OBJS/$(echo "$mod" | tr . _).o"
    echo "extern PyObject *PyInit_$short(void);"
    tabentries="$tabentries  {\"$mod\", PyInit_$short},\n"
  done
  printf 'static struct _inittab numpy_tab[] = {\n%b  {0, 0}\n};\n' "$tabentries"
  echo '__attribute__((constructor)) static void blender_web_register_numpy(void) { PyImport_ExtendInittab(numpy_tab); }'
} > "$INITTAB"
rm -f "$SYSROOT/lib/libnumpy_static.a"
emar rcs "$SYSROOT/lib/libnumpy_static.a" "$OBJS"/*.o
emcc $WASM_CFLAGS -I"$SYSROOT/include/python3.13" -c "$INITTAB" -o "$SYSROOT/lib/numpy_inittab.o"

DST="$SYSROOT/lib/python3.13/site-packages/numpy"
rm -rf "$DST"; mkdir -p "$SYSROOT/lib/python3.13/site-packages"
cp -r "$PKG" "$DST"
find "$DST" -name '*.so' -delete
find "$DST" -name '*.pyi' -delete
find "$DST" -type d \( -name tests -o -name _pyinstaller -o -name f2py \) -prune -exec rm -rf {} +
rm -rf "$DST/_core/include" "$DST/_core/lib"
log "done: $(ls "$OBJS" | wc -l) modules in libnumpy_static.a; python files in $DST ($(du -sh "$DST" | cut -f1))"
