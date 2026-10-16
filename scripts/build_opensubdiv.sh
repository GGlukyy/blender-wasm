#!/usr/bin/env bash
# OpenSubdiv 3.7.0 (CPU evaluator only) → wasm-sysroot. Blender's Subdivision Surface /
# Multires modifiers need it ("Disabled, built without OpenSubdiv" otherwise).
# Blender's FindOpenSubdiv.cmake wants BOTH libosdCPU.a and libosdGPU.a; with no GL/compute
# backend OpenSubdiv builds no GPU lib, so an empty stub archive is created.
set -euo pipefail
source "$(dirname "$0")/dep_common.sh"
src=$(fetch_extract \
  "https://github.com/PixarAnimationStudios/OpenSubdiv/archive/v3_7_0.tar.gz" \
  "opensubdiv-v3_7_0.tar.gz" "OpenSubdiv-3_7_0")
# -DOSD_PATCH_SHADER_SOURCE_GLSL=ON: osdGPU then holds the API-independent
# GLSLPatchShaderSource (Blender's subdivision shaders call
# GetPatchBasisShaderSource()); an empty stub archive is NOT sufficient.
# Approach taken from gessa-ai/blender-web scripts/deps/opensubdiv.sh (GPL-2.0-or-later).
em_cmake "$src" opensubdiv \
  -DNO_LIB=OFF -DNO_EXAMPLES=1 -DNO_TUTORIALS=1 -DNO_REGRESSION=1 -DNO_DOC=1 -DNO_OMP=1 \
  -DNO_TBB=1 -DNO_CUDA=1 -DNO_OPENCL=1 -DNO_CLEW=1 -DNO_PTEX=1 -DNO_TESTS=1 -DNO_GLTESTS=1 \
  -DNO_METAL=1 -DNO_DX=1 -DNO_OPENGL=1 -DNO_GLEW=1 -DNO_GLFW=1 -DNO_GLFW_X11=1 \
  -DNO_MACOS_FRAMEWORK=1 -DOSD_PATCH_SHADER_SOURCE_GLSL=ON
test -f "$SYSROOT/lib/libosdGPU.a" && test -f "$SYSROOT/include/opensubdiv/osd/glslPatchShaderSource.h" \
  || { echo "osdGPU / glslPatchShaderSource.h missing" >&2; exit 1; }
emnm -C --defined-only "$SYSROOT/lib/libosdGPU.a" | grep -q 'GetPatchBasisShaderSource' \
  || { echo "osdGPU lacks GetPatchBasisShaderSource" >&2; exit 1; }
ls "$SYSROOT"/lib | grep -i osd >&2
log "done"
