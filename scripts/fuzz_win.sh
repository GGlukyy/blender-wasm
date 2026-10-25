#!/bin/bash
# GUARD (Lukáš 25. 10.): samostatně zakázáno, dokud není opravený pád na iPadu (docs/IPAD_CRASH.md).
# Odblokuje jen Lukáš smazáním tohoto bloku. V rámci regress_all.sh (IN_REGRESS=1) běží normálně.
if [ "${IN_REGRESS:-}" != "1" ]; then
  echo "BLOKOVÁNO: fuzz/model_ops testy až po opravě pádu na iPadu. Dělej úkoly H1 z docs/BACKLOG.md." >&2
  exit 3
fi
# Fuzz náhodných modelovacích operací (bez pádu wasm). Výstup: OPS fuzz PASS / chyba stránky.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
sed "s/^SEED = 7; N = 400/SEED = ${FUZZ_SEED:-7}; N = ${FUZZ_N:-400}/" "$ROOT/scripts/fuzz_test.py" > "$W/fuzz_test.py"; cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=fuzz_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -v "^\[err\]" | tee "$ROOT/out/win/fuzz_result.txt"
