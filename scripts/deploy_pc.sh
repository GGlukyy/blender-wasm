#!/bin/bash
# Nasadí ${PUBDIR:-out/pubcyc} (výstup `.link53.sh`, PC build s Cycles) do demo/public jako blender-pc.* a opraví manifest.json. Záloha do out/bak_pre_deploy.
cd "$(dirname "$0")/.." || exit 1
mkdir -p out/bak_pre_deploy && cp -a demo/public/blender-pc.js demo/public/blender-pc.wasm.zst demo/public/manifest.json out/bak_pre_deploy/
cp ${PUBDIR:-out/pubcyc}/blender.js demo/public/blender-pc.js.new && cp ${PUBDIR:-out/pubcyc}/blender.wasm.zst demo/public/blender-pc.wasm.zst.new || exit 1
SZ=$(zstd -l -v ${PUBDIR:-out/pubcyc}/blender.wasm.zst 2>&1 | grep -i "Decompressed Size" | grep -o "[0-9]* B" | head -1 | cut -d' ' -f1)
[ -z "$SZ" ] && SZ=$(zstd -dc ${PUBDIR:-out/pubcyc}/blender.wasm.zst | wc -c)
python3 -I - "$SZ" <<'P'
import json,os,sys
p='demo/public/manifest.json'; m=json.load(open(p)); m['blender-pc.wasm.zst']=int(sys.argv[1])
json.dump(m,open(p+'.tmp','w'))
os.replace('demo/public/blender-pc.js.new','demo/public/blender-pc.js'); os.replace('demo/public/blender-pc.wasm.zst.new','demo/public/blender-pc.wasm.zst'); os.replace(p+'.tmp',p)
print(m)
P
