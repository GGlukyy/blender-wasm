#!/bin/bash
export Q WSLENV="Q${WSLENV:+:$WSLENV}"
# A2: zazipovaná rozšíření z extensions.blender.org (stažená ve WSL do $EXT_DIR, výchozí /tmp/a2dl) → enable ve Windows Chrome.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); D=${EXT_DIR:-/tmp/a2dl}
python3 -I - "$ROOT/scripts/addon_ext_test.py.in" "$W/addon_ext_test.py" "$D" <<'P'
import sys,base64,glob,re,os
src,dst,d=sys.argv[1:]
z={}
for f in sorted(glob.glob(d+'/add-on-*.zip')):
    n=re.match(r'add-on-(.+)-v[\d.]+\.zip',os.path.basename(f)).group(1).replace('-','_')
    z[n]=base64.b64encode(open(f,'rb').read()).decode()
open(dst,'w').write(open(src).read().replace('%ZIPS%',repr(z)))
P
cp "$ROOT/scripts/ops_test.mjs" "$W/"; mkdir -p "$W/out"
cd "$W" && cmd.exe /c "set OPS_PY=addon_ext_test.py&& set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node ops_test.mjs" 2>&1 | tr -d '\r' | grep "addon\|used\|info\|DONE\|TIMEOUT\|EXC"
