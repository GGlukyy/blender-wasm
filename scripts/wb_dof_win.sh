#!/bin/bash
# H45: Workbench Solid + DoF (kamera s DoF) — kostka se musí vykreslit rozmazaně (dřív prázdná: viewport pro mip 1/2 větší než cíl). Q=webkit_sim=1 funguje.
ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
TPL=wbdof_test.py.in MODE=SOLID SUFFIX=_dof bash "$ROOT/scripts/volume_win.sh" >/dev/null 2>&1
F="$ROOT/out/win/vol_SOLID_dof.png"; [ -f "$F" ] || { echo "FAIL wb_dof: bez screenshotu"; exit 1; }
chk() { local m; m=$(python3 -I "$ROOT/scripts/png_mean.py" "$F" $2 | awk '{print $1}'); awk -v v="$m" -v lo="$3" -v hi="$4" -v n="$1" 'BEGIN{ if (v>=lo && v<=hi) {print "PASS wb_dof " n " = " v; exit 0} else {print "FAIL wb_dof " n " = " v " (čekáno " lo ".." hi ")"; exit 1} }'; }
rc=0
chk cube_left_face "500 330 540 400" 120 160 || rc=1   # kostka vykreslená (pozadí kamery ~60)
chk cube_right_face "600 400 650 450" 75 100 || rc=1
chk background "300 245 340 285" 50 80 || rc=1
exit $rc
