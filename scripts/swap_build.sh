#!/bin/bash
# swap_build.sh old|new — nasadí build z out/bak_m4/ do demo/public/ (vč. manifest.json s velikostí po rozbalení)
set -e; ROOT=$(cd "$(dirname "$0")/.." && pwd); P=$ROOT/demo/public; B=$ROOT/out/bak_m4
case $1 in old) J=blender.js; Z=blender.wasm.zst;; new) J=new.blender.js; Z=new.blender.wasm.zst;; *) echo "usage: $0 old|new"; exit 1;; esac
cp "$B/$J" "$P/blender.js"; cp "$B/$Z" "$P/blender.wasm.zst"
python3 - "$P" <<'PY'
import sys,json,subprocess,os
p=sys.argv[1]; s={}
for n in ("blender.wasm.zst","assets.tar.zst"):
    s[n]=len(subprocess.run(["zstd","-dc",os.path.join(p,n)],capture_output=True).stdout)
open(os.path.join(p,"manifest.json"),"w").write(json.dumps(s)); print("manifest",s)
PY
