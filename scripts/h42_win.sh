#!/bin/bash
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
# H42a/c: souborové operátory × lišta (deny-list se čte z demo/src/main.js). Vyžaduje vite :5173.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
DENY=$(python3 -I - "$ROOT/demo/src/main.js" <<'P'
import re,sys
m=re.search(r"any\(w in idn for w in (\([^)]*\))\)", open(sys.argv[1]).read()); print(m.group(1))
P
)
GOLD=$(cat "$ROOT/scripts/h42_golden.json" 2>/dev/null || echo "{}")
sed "s|%DENY%|$DENY|; s|%GOLD%|$GOLD|" "$ROOT/scripts/h42_test.py.in" > "$W/h42_test.py"
cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=h42_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep -a "OPS h42\|DONE\|TIMEOUT\|EXC"
