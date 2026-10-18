#!/bin/bash
# Dávka UI fuzzů s mnoha seedy (víkendový lov pádů). Výstup: out/fuzz_long.log (řádek na seed: PASS/FAIL).
cd "$(dirname "$0")/.."
: > out/fuzz_long.log
for seed in ${SEEDS:-31 32 33 34 35 36 37 38}; do
  for full in 0 1; do
    r=$(FUZZ_SEED=$seed FUZZ_SECS=${FUZZ_SECS:-120} FUZZ_FULL=$full TAILN=6 scripts/ui_fuzz_win.sh 2>&1 | tail -3 | tr '\n' ' ')
    echo "seed=$seed full=$full :: $r" >> out/fuzz_long.log
  done
done
echo "=== hotovo" >> out/fuzz_long.log
