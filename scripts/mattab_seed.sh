#!/bin/bash
# Doplní do wgsl-cache.json shadery náhledů materiálů (záložka Material) — mattab_test.mjs se SEEDOUT=1.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/mattab_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set SEEDOUT=1&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mattab_test.mjs" 2>&1 | tr -d '\r' | grep "EXPORTED\|BLOCK"
cd "$ROOT" && python3 -I - "$W/out/mattab_seed.json" "$ROOT/demo/public/wgsl-cache.json" <<'PY'
import json,sys,os,shutil
new=json.load(open(sys.argv[1])); dst=sys.argv[2]
old=json.load(open(dst)) if os.path.exists(dst) else []
m=dict(old); m.update(dict(new)); json.dump(list(m.items()),open(dst,'w'))
shutil.copy(dst,"web/wgsl-cache.json")
print("seed: +%d, total %d, %d bytes"%(len(new),len(m),os.path.getsize(dst)))
PY
