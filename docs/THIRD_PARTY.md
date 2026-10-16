# THIRD_PARTY — převzatý kód

Base: HeyPuter/blender-wasm + HeyPuter/blender (GPL-2.0).

| Co | Odkud (repo, commit, soubor) | Licence |
|---|---|---|

## gessa-ai/blender-web (GPL-2.0-or-later) — ref. commit 0e02e84 (~/ref/gessa)
- **OpenSubdiv pro wasm** (16. 10. 2026): postup převzat z `scripts/deps/opensubdiv.sh` (CPU-only build, `-DOSD_PATCH_SHADER_SOURCE_GLSL=ON`, `osdGPU` s `GLSLPatchShaderSource`) → naše `scripts/build_opensubdiv.sh`.
  Ochranné `#if !defined(__EMSCRIPTEN__)` kolem desktop-GL includů v `intern/opensubdiv/internal/evaluator/eval_output_gpu.h` a `gpu_compute_evaluator.cc` převzaty z `patches/0111-opensubdiv-gpu-eval-guard-desktop-gl-includes.patch` (v našem forku Blenderu, větev `ipad`).

## Blender essentials node assety (CC0) — projects.blender.org, větev `blender-v5.2-release`
- `demo/node-assets/nodes/{geometry,shading,compositing}_nodes_essentials.blend`: assety pro modifikátory Array, Scatter on Surface apod. (git-lfs upstreamu je neanonymní, proto vendorováno; starší verze souboru se v 5.3 alpha načítají).
