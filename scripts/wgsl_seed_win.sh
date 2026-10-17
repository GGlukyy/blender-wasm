#!/bin/bash
# Spustí scripts/wgsl_seed_win.mjs ve Windows Chrome. $1 = seed|verify. seed -> demo/public/wgsl-cache.json
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
# seed MERGUJE do existujícího demo/public/wgsl-cache.json (smaž ho ručně pro čistý start)
cp "$ROOT/scripts/wgsl_seed_win.mjs" "$W/"; mkdir -p "$W/out"; rm -f "$W/capenv.json"
cd "$W" && cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node wgsl_seed_win.mjs $1" 2>&1 | tr -d '\r'
mkdir -p "$ROOT/out/win"; cp "$W"/out/wgsl_* "$ROOT/out/win/" 2>/dev/null
if [ "$1" = seed ]; then
  cd "$ROOT" && python3 -I - "$W/out/wgsl-cache.json" "$ROOT/demo/public/wgsl-cache.json" <<'PY'
import json,sys,os,shutil
new=json.load(open(sys.argv[1])); dst=sys.argv[2]
old=json.load(open(dst)) if os.path.exists(dst) else []
m=dict(old); m.update(dict(new)); json.dump(list(m.items()),open(dst,'w'))
shutil.copy(dst,"web/wgsl-cache.json")
print("seed: +%d new, total %d, %d bytes"%(len(new),len(m),os.path.getsize(dst)))
PY
fi
