#!/usr/bin/env bash
# Runs Claude Code unattended until a deadline. Each run = fresh session reading docs/WEEKEND.md.
# Usage:  bash scripts/weekend_loop.sh "2026-10-19 08:00"     (deadline, local time)
# Stop:   Ctrl+C (twice)
set -u
cd "$(dirname "$0")/.."
DEADLINE_STR="${1:-$(date -d 'next monday 08:00' '+%F %T')}"
export WEEKEND_DEADLINE=$(date -d "$DEADLINE_STR" +%s)
mkdir -p out/weekend
rm -f out/.idle_stop
echo "Weekend loop until $DEADLINE_STR. Logs: out/weekend/"
i=0
while (( $(date +%s) < WEEKEND_DEADLINE - 600 )); do
  i=$((i+1)); log="out/weekend/run_$(date +%m%d_%H%M)_$i.log"; rm -f out/.stop_blocks
  echo "=== [$(date '+%F %T')] run $i → $log"
  git pull -q --rebase || true
  start=$(date +%s)
  claude -p "Read docs/WEEKEND.md and follow it. Today is $(date '+%A %F %H:%M'). Deadline: $DEADLINE_STR." \
    --model sonnet --dangerously-skip-permissions > "$log" 2>&1
  rc=$?; dur=$(( $(date +%s) - start ))
  if [ -f out/.idle_stop ]; then echo "Claude hlásí: nic dalšího k práci bez tebe (out/.idle_stop). Konec smyčky."; cat out/.idle_stop; break; fi
  tail -3 "$log" | sed 's/^/    /'
  if grep -qiE 'usage limit|limit reached|rate.?limit|resets' "$log" || (( dur < 180 )); then
    reset=$(grep -oE '\|[0-9]{10}' "$log" | tail -1 | tr -d '|')
    if [[ -n "$reset" ]] && (( reset > $(date +%s) )); then wait_s=$(( reset - $(date +%s) + 120 ));
    else wait_s=1800; fi
    echo "    limit/short run (rc=$rc, ${dur}s) → waiting $((wait_s/60)) min"
    sleep "$wait_s"
  else
    sleep 60
  fi
done
echo "Deadline reached. See docs/STATUS.md."
