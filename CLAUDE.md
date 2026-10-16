# CLAUDE.md — Blender na iPadu (fork HeyPuter/blender-wasm)

You work **interactively with Lukáš on his PC** (Windows + WSL2 Ubuntu). He is a
game-design student and an everyday Blender user, not a C++/graphics engineer.
Talk to him in **plain Czech, short sentences**, English for technical terms.
He tests on a real **iPad Air M1, iPadOS 26.5, Safari** — you cannot. His reports
("výběr v edit modu není vidět") are the bug reports; ask him for exact steps
and screenshots when needed.

## 1. Mission
Make real Blender in the browser **actually usable on iPad Safari** for modeling
small assets. The port itself already works (thanks to HeyPuter). We do the polish:
speed, rendering bugs, touch/Pencil input, iPad workflow (files, fullscreen).

Not our goal: rewriting the port, Cycles speed, new Blender features, chasing
newer Blender/Emscripten versions.

## 2. Two repositories
- `GGlukyy/blender-wasm` (this repo): build scripts (`Makefile`, `scripts/`),
  web shell (`demo/`), tests (`scripts/*_test.mjs`).
- `GGlukyy/blender` (fork of HeyPuter/blender): Blender source **with the WebGPU
  backend** (`source/blender/gpu/`). `make blender` checks it out into `./blender/`
  at `BLENDER_REF` from the `Makefile`.
- C++ changes: commit inside `./blender/` on branch `ipad`, push to
  `GGlukyy/blender`, then update `BLENDER_REF` in the `Makefile` to that commit.
- Remote `upstream` = HeyPuter. Before bigger work, check if upstream already
  fixed it (`git fetch upstream`). Good fixes can be offered back as a PR.

## 3. Rules
1. **Fix, don't rewrite.** Smallest change in existing code. Read the code around
   the bug first; compare the WebGPU backend with Vulkan/Metal in the same folder.
2. **JS first.** If a problem can be solved in `demo/` (no Blender rebuild), do it there.
3. **Proof.** A fix is done when (a) a test in `scripts/` or a new one passes on the
   PC (Chrome), and (b) Lukáš confirmed it on the iPad. Write both into
   `docs/STATUS.md`.
4. **Never weaken tests.** No raised tolerances, no deleted asserts.
5. **Stuck rule.** Same error 2× → ask the `architect` subagent (Opus). 3× → stop,
   write what you tried into `docs/STATUS.md`, propose another task.
6. **Build time is precious.** Never delete build dirs without reason. Rebuild only
   what changed (`ninja` in the existing build dir). Run long builds with
   `setsid nohup … > out/build.log 2>&1 &` and check the log, don't block.
7. **Commit small**, one fix per commit, message `P<n>: <co> (<důkaz>)`.
   Don't push to `master` without telling Lukáš; he decides.
8. Upstream workflow `.github/workflows/build-release.yml` is HeyPuter's release
   build (hours). Leave it untouched; Actions on this fork stay off.

## 4. Testing on the iPad
iPad Safari needs `crossOriginIsolated` (threads) → **HTTPS** + COOP/COEP headers.
LAN `http://192.168…` will NOT work. Use:
```bash
cd demo && pnpm dev --host            # vite already sends COOP/COEP
cloudflared tunnel --url http://localhost:5173   # prints https://….trycloudflare.com
```
Give Lukáš the https link. After a change: rebuild if needed → he reloads the page.
Remember the WGSL cache in IndexedDB: for "first time" tests he must clear site
data (Nastavení → Safari → Pokročilé → Data webových stránek) or use a private tab.

## 5. Where things are
- `demo/src/main.js` — loader, OPFS/IndexedDB, **WGSL cache** (`wgsl-cache.json` seed).
- `scripts/wgsl_seed.mjs`, `scripts/wgsl_dump.mjs` — generating the shader seed.
- `scripts/link_blender_web.sh` — final link of blender.wasm.
- `scripts/*_test.mjs` — Playwright tests (editmode, select, saveload, workspace…).
- `blender/source/blender/gpu/` — WebGPU backend (C++).
- `docs/PLAN.md` — priorities. `docs/STATUS.md` — current state (Czech, short).
- `docs/LESSONS.md` — write a line every time you lose > 15 min on something.

## 6. Writing for Lukáš
Every session end: update `docs/STATUS.md` — first line
`Výsledek: ✅ / 🟡 / 🔴`, then *Co jsem udělal*, *Důkaz*, *Co nefunguje*,
*Co otestovat na iPadu* (exact steps), *Co dál*. Short bullets. If you guessed, write "odhad".
