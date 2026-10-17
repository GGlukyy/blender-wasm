# THIRD_PARTY — převzatý kód

Base: HeyPuter/blender-wasm + HeyPuter/blender (GPL-2.0).

| Co | Odkud (repo, commit, soubor) | Licence |
|---|---|---|

## gessa-ai/blender-web (GPL-2.0-or-later) — ref. commit 0e02e84 (~/ref/gessa)
- **OpenSubdiv pro wasm** (16. 10. 2026): postup převzat z `scripts/deps/opensubdiv.sh` (CPU-only build, `-DOSD_PATCH_SHADER_SOURCE_GLSL=ON`, `osdGPU` s `GLSLPatchShaderSource`) → naše `scripts/build_opensubdiv.sh`.
  Ochranné `#if !defined(__EMSCRIPTEN__)` kolem desktop-GL includů v `intern/opensubdiv/internal/evaluator/eval_output_gpu.h` a `gpu_compute_evaluator.cc` převzaty z `patches/0111-opensubdiv-gpu-eval-guard-desktop-gl-includes.patch` (v našem forku Blenderu, větev `ipad`).

## Blender essentials node assety (CC0) — projects.blender.org, větev `blender-v5.2-release`
- `demo/node-assets/nodes/{geometry,shading,compositing}_nodes_essentials.blend` + `geometry_nodes_dynamics_assets`, `procedural_hair_node_assets`, `principal_components` (z Blender 5.2 desktop, CC0): assety pro modifikátory Array, Scatter on Surface apod. (git-lfs upstreamu je neanonymní, proto vendorováno; starší verze souboru se v 5.3 alpha načítají).

## numpy 2.3.4 (static, wasm) — `scripts/build_numpy.sh`
- Source: numpy 2.3.4 sdist (BSD-3-Clause). Cross-compile recipe (meson cross file values `longdouble_format='IEEE_QUAD_LE'`, `-Wno-return-type`, cython from the build machine) follows numpy PR #24603 / numpy "cross compilation" docs and the Pyodide numpy recipe (pyodide/pyodide-recipes, MPL-2.0 recipe, ideas only, no files copied). Static linking via CPython inittab is our own (`numpy_inittab.o`).
