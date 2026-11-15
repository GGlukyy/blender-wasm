#!/bin/bash
# Pravidlo 3b: stejný RNA sweep v desktop Blenderu (Steam, GUI). Výstup: out/win/rna_sweep_desktop.txt (OPS řádky). Pád = Blender skončí bez OPS_DONE.
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/rna_sweep_test.py" "$W/"; mkdir -p "$W/out"
export RNA_QUIT=1 WSLENV="RNA_QUIT${WSLENV:+:$WSLENV}"
cd "$W" && timeout ${RUN_TIMEOUT:-1200} "/mnt/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" --factory-startup --window-geometry 0 0 1400 850 --python rna_sweep_test.py 2>&1 | tr -d '\r' | grep -a -E "OPS|Error|Traceback|EXCEPTION|Blender [0-9]" > "$ROOT/out/win/rna_sweep_desktop.txt"
echo "rc=${PIPESTATUS[0]} done=$(grep -a -c OPS_DONE "$ROOT/out/win/rna_sweep_desktop.txt") last=$(grep -a 'OPS rna set' "$ROOT/out/win/rna_sweep_desktop.txt" | tail -1)"
