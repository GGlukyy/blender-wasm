#!/bin/bash
# M0 telemetrie: Windows Chrome, ?tel=1, ztráta GPU; kontrola out/ipad/tel_*.jsonl. Vyžaduje vite na :5173 (WSL).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
F=$ROOT/out/ipad/tel_$(date +%F).jsonl; B=$(wc -l < "$F" 2>/dev/null || echo 0)
cp "$ROOT/scripts/tel_test.mjs" "$W/"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node tel_test.mjs" 2>&1 | tr -d '\r' | tail -10
tail -n +$((B+1)) "$F" > "$ROOT/out/tel_last.jsonl"
S=$(grep -c '"kind":"sample"' "$ROOT/out/tel_last.jsonl"); L=$(grep -c '"kind":"lost"' "$ROOT/out/tel_last.jsonl"); A=$(grep -c '"kind":"adapter"' "$ROOT/out/tel_last.jsonl")
G=$(grep -c '"gpu":{' "$ROOT/out/tel_last.jsonl"); D=$(grep -c '"kind":"lost_detail"' "$ROOT/out/tel_last.jsonl")
H=$(grep '"kind":"sample"' "$ROOT/out/tel_last.jsonl" | grep -c '"heap_mb"')
if [ "$S" -ge 10 ] && [ "$L" -ge 1 ] && [ "$A" -ge 1 ] && [ "$H" -ge 5 ] && [ "$G" -ge 5 ] && [ "$D" -ge 1 ]; then echo "PASS tel: samples=$S (s heap=$H, s gpu=$G) adapter=$A lost=$L lost_detail=$D"; else echo "FAIL tel: samples=$S heap=$H gpu=$G adapter=$A lost=$L lost_detail=$D"; fi
