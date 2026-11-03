# Blender Web — unofficial port

[![Try it on itch.io](https://img.shields.io/badge/Try_it-itch.io-FA5C5C?logo=itchdotio&logoColor=white)](https://ggluki.itch.io/blender-web-unofficial-test)
![Blender 5.3 alpha](https://img.shields.io/badge/Blender-5.3_alpha-E87D0D?logo=blender&logoColor=white)
![WebGPU](https://img.shields.io/badge/WebGPU-WebAssembly-654FF0?logo=webassembly&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?logo=googlechrome&logoColor=white)
![iPad Safari](https://img.shields.io/badge/iPad_Safari-supported-000000?logo=apple&logoColor=white)
![License GPL](https://img.shields.io/badge/license-GPL-blue)

Real Blender compiled to WebAssembly + WebGPU. No install, runs in the browser — on desktop and on iPad (touch, Apple Pencil, keyboard).

<!-- GIF: docs/media/demo.gif -->
<img width="1907" height="1076" alt="Blender running in the browser" src="https://github.com/user-attachments/assets/04296d56-da28-42b7-bf9d-f703ccf15684" />

## Works
Modeling · Edit Mode · Sculpt · UV · Texture Paint · Grease Pencil · Solid / Material Preview / Rendered (EEVEE) · open, save, import, export · add-ons from disk

## Limits
- Material Preview is slow on iPad (~4 fps)
- Long session → switching to Rendered can freeze. Save first.
- "Out of memory" on iPad: close the tab completely and open it again
- No Cycles · English UI only · needs WebGPU (Chrome/Edge, Safari on iPadOS 26+)

## Next
Blender 5.3 release · faster iPad viewport · Cycles on desktop (later)

## Bugs
Open an [issue](https://github.com/GGlukyy/blender-wasm/issues) or comment on itch.io: device + browser, steps, screenshot.
If desktop Blender does the same, it's a Blender bug, not this port.

## Build
```bash
make all && make blender-web
cd demo && pnpm dev
```
Blender source with the WebGPU backend: [GGlukyy/blender](https://github.com/GGlukyy/blender) (branch `ipad`). Dev notes in `docs/` are in Czech.

---
Unofficial, not affiliated with the Blender Foundation. "Blender" is their trademark.
Based on [HeyPuter/blender-wasm](https://github.com/heyputer/blender-wasm) — thanks for the original port. GPL licensed.
