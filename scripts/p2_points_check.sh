#!/bin/bash
# P2 test: vrcholy v edit modu se kreslí jako quady (indexed point expand). Kostka posunutá o 3 m
# (ověří ModelMatrix/resource id). Screenshot: out/win/p2_pointschk_9_Home.png — oranžové tečky na rozích.
cd "$(dirname "$0")/.."
CAPENV='{"WGPU_LOG_POINTS":"1"}' scripts/p2_win.sh pointschk Escape,g,x,3,Enter,Tab,a,Home >/dev/null
L=out/win/p2_pointschk.log
grep -q "WGPU_PTS indexed expand 'overlay_edit_mesh_vert' points=8" "$L" && echo "PASS: indexed point expansion active (8 points)" || { echo "FAIL: edit-mode vertices not expanded"; grep WGPU_PTS "$L" | head -3; exit 1; }
