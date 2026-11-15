#!/bin/bash
# C1: desktop 5.3.0 reference render (3b). Výstup: out/win/cycles_desktop.txt (+ PNG p2win/out/cyc_desktop.png → out/win/cyc_desktop.png)
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd)
cp "$ROOT/scripts/cycles_test.py" "$ROOT/scripts/cycles_desktop.py" "$W/"; mkdir -p "$W/out"
cd "$W" && "/mnt/c/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" -b --factory-startup --python cycles_desktop.py 2>&1 | tr -d '\r' | grep -a "OPS cycles\|Error\|Traceback" | tee "$ROOT/out/win/cycles_desktop.txt"
cp "$W/out/cyc_desktop.png" "$ROOT/out/win/" 2>/dev/null
