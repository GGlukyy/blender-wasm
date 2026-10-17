#!/bin/bash
# Celá regresní sada ve Windows Chrome (vyžaduje dev server :5173). Trvá ~25 min. Výstup: out/regress.log
cd "$(dirname "$0")/.."
L=out/regress.log; : > $L
run() { echo "=== $1" | tee -a $L; shift; timeout 900 "$@" 2>&1 | tail -${TAILN:-6} | tee -a $L; }
TAILN=30 run parity scripts/parity_win.sh
run ops scripts/ops_win.sh | grep -v PASS
run undo scripts/undo_win.sh
TAILN=14 run interactive scripts/interactive_win.sh
run sculpt scripts/sculpt_win.sh
run touch scripts/touch_win.sh
run occl scripts/p2_occl_check.sh
run blend_open scripts/blend_open_win.sh
run files scripts/files_win.sh
run seed_verify scripts/wgsl_seed_win.sh verify
echo "=== hotovo" | tee -a $L
