# WEEKEND — samostatná práce (Lukáš je pryč, iPad netestuje)

You are running unattended in a loop (`scripts/weekend_loop.sh`). Each run is a fresh
session: read `CLAUDE.md`, `docs/STATUS.md`, `docs/PLAN.md` and `docs/BACKLOG.md` first.
Lukáš cannot test on the iPad until he is back — verify everything yourself in Windows
Chrome on the real GPU (`scripts/p2_win.sh`, `scripts/parity_win.sh`).

## How to work
1. Take the first unchecked item in `docs/BACKLOG.md`. Mark it `[~]` (in progress) and commit.
2. Fix it with the smallest change; prove it with a script in `scripts/` (screenshot + PASS line).
3. Commit + push after every green step (blender fork branch `ipad` + update `BLENDER_REF`,
   then this repo `master`). Mark the item `[x]` with the proof line.
4. Same error 2× → ask the `architect` subagent. 3× → mark `[!] BLOCKED: <why>` and move on.
5. Backlog empty → **hunt for new bugs**: extend `scripts/parity_test.mjs` with more
   TEST_CHECKLIST items and common modeling ops (loop cut, knife, inset, extrude along normals,
   merge, UV unwrap, materials, save/reload, undo). Every new failure → new BACKLOG item.
6. Nothing failing → **performance** (`docs/BACKLOG.md` section Výkon): measure first
   (frame time, draw calls, buffer uploads per frame, shader translations), fix the biggest.
7. Never break the build. If a change cannot be made green, revert it and write why in STATUS.md.
8. Before ending a session: update `docs/STATUS.md` top section ("Víkend — co je nového",
   "Co otestovat na iPadu" sorted by importance, "Blocked"). Keep it short, Czech.
