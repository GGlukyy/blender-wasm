#!/bin/bash
# GUARD (Lukáš 25. 10.): samostatně zakázáno, dokud není opravený pád na iPadu (docs/IPAD_CRASH.md).
# Odblokuje jen Lukáš smazáním tohoto bloku. V rámci regress_all.sh (IN_REGRESS=1) běží normálně.
if [ "${IN_REGRESS:-}" != "1" ]; then
  echo "BLOKOVÁNO: fuzz/model_ops testy až po opravě pádu na iPadu. Dělej úkoly H1 z docs/BACKLOG.md." >&2
  exit 3
fi
# UI fuzz (náhodné klávesy/myš) ve Windows Chrome. FUZZ_SEED, FUZZ_SECS přes WSLENV. Vyžaduje vite na :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/ui_fuzz_test.mjs" "$W/"; mkdir -p "$W/out"
export WSLENV=FUZZ_SEED:FUZZ_SECS:FUZZ_FULL:FUZZ_STACK:FUZZ_KEYSET:FUZZ_SKIP:FUZZ_N
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ui_fuzz_test.mjs" 2>&1 | tr -d '\r' | tail -${TAILN:-40}
mkdir -p "$ROOT/out/win"; cp "$W"/out/ui_fuzz_end.png "$ROOT/out/win/" 2>/dev/null
