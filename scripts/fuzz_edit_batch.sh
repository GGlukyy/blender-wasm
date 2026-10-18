#!/bin/bash
# Dávka edit-mode a objektových fuzzů s mnoha seedy. Výstup: out/fuzz_edit_batch.log
cd "$(dirname "$0")/.."
: > out/fuzz_edit_batch.log
for seed in ${SEEDS:-41 42 43 44 45 46}; do
  r=$(FUZZ_SEED=$seed timeout 500 scripts/fuzz_win.sh 2>&1 | tail -2 | tr '\n' ' '); echo "edit seed=$seed :: $r" >> out/fuzz_edit_batch.log
  r=$(FUZZ_SEED=$seed timeout 500 scripts/fuzz_obj_win.sh 2>&1 | tail -2 | tr '\n' ' '); echo "obj  seed=$seed :: $r" >> out/fuzz_edit_batch.log
done
echo "=== hotovo" >> out/fuzz_edit_batch.log
