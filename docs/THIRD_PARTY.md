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
- `demo/app-templates/*/startup.blend`: šablony File ▸ New (2D Animation, Sculpting, Storyboarding, VFX, Video Editing), zkopírováno z Blenderu 5.2 (GPL), protože v forku jsou git-lfs ukazatele.

## mcp/ (Blender Web MCP)
- Názvy nástrojů (`get_scene_info`, `get_object_info`, `get_viewport_screenshot`, `execute_blender_code`) převzaty z ahujasid/blender-mcp (MIT) kvůli kompatibilitě promptů; kód je vlastní. Závislosti: `@modelcontextprotocol/sdk` (MIT), `ws` (MIT), `zod` (MIT).
- GMP 6.3.0 (LGPL-3.0-or-later / GPL-2.0-or-later), https://gmplib.org, stejná verze jako Blender, přeloženo do wasm `scripts/build_gmp.sh`, bez úprav.
- Manifold v3.4.1 (Apache-2.0), https://github.com/elalish/manifold, stejná verze jako Blender, přeloženo do wasm `scripts/build_manifold.sh` (`MANIFOLD_PAR=OFF`), bez úprav.

## coi-serviceworker (vzor pro `demo/public/sw.js`)
- Autor: Guido Zuidhof, MIT, https://github.com/gzuidhof/coi-serviceworker. Převzat jen princip (service worker přidá COOP/COEP/CORP hlavičky, stránka se po registraci jednou znovu načte); kód `sw.js` je vlastní (+ offline cache). Použito v `demo/public/sw.js`, `demo/src/main.js` (O1a/O1b, 15.–17. 11. 2026).

## FFTW 3.3.10 (GPL-2.0-or-later, static, wasm) — `scripts/build_fftw3.sh`
Ocean modifier a FFT ve Glare/Convolve compositoru (`WITH_FFTW3=ON`, F2b). Zdroj https://www.fftw.org/fftw-3.3.10.tar.gz, beze změn; libfftw3, libfftw3f, libfftw3f_threads. Blender je GPL, takže kompatibilní.
