# OPS_RESULTS — modelovací operace ve web buildu (PC, Windows Chrome, 17. 10. 2026)

| Test | Skript | Výsledek |
|---|---|---|
| 27 operací přes Python (subdivide, extrude, inset, bevel, delete, triangulate, merge, dissolve, UV smart/unwrap, materiál, modifikátory Subsurf/Array/Mirror/Bevel/Solidify/Boolean, primitiva, join/separate, bmesh, export OBJ/STL/PLY, uložit+načíst) | `scripts/ops_win.sh` | 27/27 ✅ (počty v/e/f = desktop) |
| Undo/Redo klávesami (Tab, A, E, Ctrl+Z, Ctrl+Shift+Z) | `scripts/undo_win.sh` | ✅ 8→16→8→16 |
| Interaktivně: G X 2, R Z 90, S 2, Tab, A+E, Ctrl+Z, Ctrl+B, Ctrl+R (loop cut), Shift+D | `scripts/interactive_win.sh` | ✅ ALL PASS |
| Sculpt tah štětcem | `scripts/sculpt_win.sh` | ✅ geometrie se změní (maxr 1.00→1.05) |
| Výběr skrz objekt (vertex/edge/face, box) | `scripts/p2_occl_check.sh` | ✅ |
| Otevření 64-bit .blend (kolize pointerů) | `scripts/blend_open_win.sh` | ✅ |

Poznámky: `bpy.ops.ed.undo()` jde z Python timeru jen s kontextem (poll) → testováno klávesami. Miniatury štětců v asset shelfu v Sculpt módu jsou „hodiny“ (náhledy se negenerují) — kosmetické, viz BACKLOG.
