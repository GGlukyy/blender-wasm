# LESSONS — co nás stálo čas (krátce, jeden řádek na věc)

- iPad Safari potřebuje HTTPS kvůli SharedArrayBuffer (vlákna). LAN http nefunguje → cloudflared tunel.
- WGSL cache je v IndexedDB → pro test „poprvé“ smazat data webu nebo anonymní panel.
- Dlouhé buildy pouštět přes `setsid nohup … &` a číst log; neblokovat terminál.
- Repo klonovat do WSL (`~/`), ne do `/mnt/c/…` — build přes Windows disk je mnohonásobně pomalejší.
- Build blender-wasm od nuly: čekej 4 skryté chyby linku (host python, duplicitní expat, emdawnwebgpu port, brotli) — všechny teď v `cmake/blender-wasm-cache.cmake`. `ninja` selhání na `bin/blender.js` ignorovat, link dělá `link_blender_release.sh`. Ztraceno ~40 min.
- Hypotézy z PLAN.md (depth range) ověř MĚŘENÍM dřív než kódem: `WGPU_LOG_DRAW` (přes `window.__CAPENV`) + experiment „vypnout depth“ + „natvrdo fialová barva ve fragment shaderu“ rozlišily příčinu za ~1 h; čtení kódu ji nenašlo.
- Screenshoty canvasu: Chrome ve WSL (SwiftShader) kreslí canvas BÍLE → testuj ve Windows Chrome přes `scripts/p2_win.sh` (node.exe + playwright-core, `C:\Users\<u>\p2win`).
- Komentáře ve `.glsl` shader_tool maže → marker `/* DEBUG */` v shaderu v buildu není; shadery jsou v targetu `bf_draw_shaders`. `git push` do forku Blenderu: `GIT_LFS_SKIP_PUSH=1`.
- 17. 10.: WGSL seed/IndexedDB cache nikdy nefungovala — Blender běží na pthread workeru (`PROXY_TO_PTHREAD`), `globalThis` z `main.js` tam není. Cokoli z JS pro C++ musí jít sync XHR / BroadcastChannel, ne přes globál stránky.
- 17. 10.: `--python-expr` ve wasm: bez `sys.stdout.flush()` se výstup nikdy nedostane do konzole stránky. Detektor první verze odmítl i vestavěný startup.blend (legitimní duplicitní adresy) — porovnávat RAW 64bit hodnoty, ne zkrácené.
- 17. 10.: Jakákoli změna GLSL preambule (`webgpu_glsl_patch`) mění klíče WGSL cache → seed je k ničemu; po změně vždy `scripts/wgsl_seed_win.sh seed` (2×) a `verify`.

- 17. 10.: PNG save padal na „tEXt: invalid keyword“ (~1,5 h). Nehledat v libpng: pomohl debug fprintf do libpng → klíč byl prázdný → OIIO `ustring::string()` prázdné kvůli libc++ hacku. Knihovní chyby ladit printfem v deps/src + `build_*.sh` + `link_blender_release.sh` (bez ninja).
