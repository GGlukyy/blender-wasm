#!/usr/bin/env bash
# Stop hook: during the weekend loop, refuse to stop early while time remains.
cat > /dev/null
[[ -z "${WEEKEND_DEADLINE:-}" ]] && exit 0
left=$(( (WEEKEND_DEADLINE - $(date +%s)) / 60 ))
(( left < 20 )) && exit 0
f="${CLAUDE_PROJECT_DIR:-.}/out/.stop_blocks"; mkdir -p "$(dirname "$f")"
n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$f"
(( n > 25 )) && exit 0
printf '{"decision":"block","reason":"Do not stop: weekend work continues (%s min left). Follow docs/WEEKEND.md: commit+push what you have, update docs/BACKLOG.md, then take the next item; if the backlog is empty, hunt for new bugs, then performance."}\n' "$left"
