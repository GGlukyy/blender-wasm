# Blender Web — unofficial iPad-focused port

Real Blender, compiled to WebAssembly + WebGPU, running in the browser. This fork focuses on making it
**usable on iPad Safari** (touch, Apple Pencil, keyboard, files) for modeling small assets.

**Try it:** https://ggluki.itch.io/blender-web-unofficial-test

> Unofficial project. Not affiliated with or endorsed by the Blender Foundation. "Blender" is a trademark of the
> Blender Foundation. Based on [HeyPuter/blender-wasm](https://github.com/heyputer/blender-wasm) — all credit for
> the original port goes to them. Licensed under GPL like Blender itself.

<img width="1907" height="1076" alt="image" src="https://github.com/user-attachments/assets/04296d56-da28-42b7-bf9d-f703ccf15684" />

## What works
- Modeling, Edit Mode, Sculpt, UV Editing, Texture Paint, Grease Pencil (2D Animation)
- Solid, Wireframe, Material Preview and Rendered (EEVEE) viewport — also on iPad
- Open / Save / Import / Export through the browser (files stay on your device), add-ons from disk
- Touch + Apple Pencil, on-screen key bar, hardware keyboard (Cmd = Ctrl, non-US layouts like QWERTZ)

## Known limits
- Material Preview runs at ~4 fps on iPad (iPad Air M1); desktop Chrome is much faster
- After a long session, switching Material Preview → Rendered can freeze — save first, or reload
- After a crash Safari may keep the old tab's memory: close the tab fully and open it again
- No Cycles, no simulations/video, UI is English only
- Needs a browser with WebGPU (desktop Chrome/Edge, Safari on iPadOS 26+)

## What's next
- Move to the Blender 5.3 release (current build: Blender 5.3 alpha, June 2026)
- Faster Material Preview on iPad, more touch/Pencil polish
- Cycles on desktop browsers (later)
- Offer the fixes back to HeyPuter upstream

## Found a bug?
Open an [issue](https://github.com/GGlukyy/blender-wasm/issues) or write a comment on the itch.io page. Please include:
device + browser (e.g. iPad Air M1, Safari, iPadOS 26.5), what you did step by step, what happened, and a screenshot.
First check if the same thing happens in desktop Blender — if yes, it's a Blender bug, not this port.

## Building

```bash
make all
make blender-web
cd demo
pnpm dev
```

## iPad notes
- Material Preview (EEVEE, "lite" profile) is **on by default** on iPad Safari. Add `?mp=0` to the URL for the lighter "MP Lite" (Solid with textures).
- **Rendered** shading works, but after a long session (10+ min) switching Material Preview → Rendered has frozen Blender once. Save first (autosave runs every 30 s), or reload the tab before switching.
- After a crash/reload Safari may keep the old tab's memory: close the tab fully and open the page again.
- Cmd+key on a hardware keyboard acts as Ctrl (Cmd+Z = undo).
