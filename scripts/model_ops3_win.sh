#!/bin/bash
# GUARD (Lukáš 25. 10.): samostatně zakázáno, dokud není opravený pád na iPadu (docs/IPAD_CRASH.md).
# Odblokuje jen Lukáš smazáním tohoto bloku. V rámci regress_all.sh (IN_REGRESS=1) běží normálně.
if [ "${IN_REGRESS:-}" != "1" ]; then
  echo "BLOKOVÁNO: fuzz/model_ops testy až po opravě pádu na iPadu. Dělej úkoly H1 z docs/BACKLOG.md." >&2
  exit 3
fi
# Render (write_still) zapíše skutečné pixely, ne nuly. Výstup: řádky OPS render_write … PASS/FAIL
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/model_ops3_test.py" "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=model_ops3_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | tee "$ROOT/out/win/model_ops3_result.txt"
