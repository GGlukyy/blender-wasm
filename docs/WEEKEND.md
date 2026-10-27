# WEEKEND — samostatná práce (Lukáš je pryč, iPad netestuje)

You are running unattended in a loop (`scripts/weekend_loop.sh`). Each run is a fresh
session: read `CLAUDE.md`, `docs/STATUS.md`, `docs/PLAN.md` and `docs/BACKLOG.md` first.
Lukáš cannot test on the iPad until he is back — verify everything yourself in Windows
Chrome on the real GPU (`scripts/p2_win.sh`, `scripts/parity_win.sh`).

## Mission now (from 25. 10. 10:30) — ONLY THIS
**Fix the iPad crash per `docs/IPAD_CRASH.md`** (read it fully first). Work the `[ ] H1…` items at the top of
`docs/BACKLOG.md` in order. Measure before fixing. Start every run by reading new files in `out/ipad/`.
**FORBIDDEN until H1-A is deployed and Lukáš has tested it:** new fuzz runs, new `*_win.sh` tests that are not
in `docs/IPAD_CRASH.md`, model_ops*, touch_fuzz, regress_all more than once per code change. These do not help
the iPad (Chrome on PC never crashes). If you are blocked, ask the `architect`; if still blocked, write it
into STATUS.md and END the run — do not fill time with tests.

## How to work
1. Take the first unchecked item in `docs/BACKLOG.md`. Mark it `[~]` (in progress) and commit.
2. Fix it with the smallest change; prove it with a script in `scripts/` (screenshot + PASS line).
3. Commit + push after every green step (blender fork branch `ipad` + update `BLENDER_REF`,
   then this repo `master`). Mark the item `[x]` with the proof line.
4. Same error 2× → ask the `architect` subagent. 3× → mark `[!] BLOCKED: <why>` and move on.
5. Backlog empty / only waiting for iPad data or a Blender release → write STATUS.md, then `echo "<proč, 1 řádek>" > out/.idle_stop` (smyčka se tím ukončí, nepálit tokeny kontrolami) and END the run (no bug hunting, no performance work this weekend).
6. Never break the build. If a change cannot be made green, revert it and write why in STATUS.md.
7. Before ending a session: update `docs/STATUS.md` top section ("Víkend — co je nového",
   "Co otestovat na iPadu" sorted by importance, "Blocked"). Keep it short, Czech.
