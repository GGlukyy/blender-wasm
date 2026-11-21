#!/bin/bash
# H46: Workbench Solid + Shadows (kostka + plane) web vs desktop 5.3.0 (hodnoty z desktopu: kostka přední stěna ~95, horní ~107, vržený stín ~5). Q=webkit_sim=1 funguje. Vyžaduje vite :5173.
ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
TPL=wb_shadow_test.py.in MODE=SOLID SUFFIX=_wbshadow bash "$ROOT/scripts/volume_win.sh" >/dev/null 2>&1
F="$ROOT/out/win/vol_SOLID_wbshadow.png"; [ -f "$F" ] || { echo "FAIL wb_shadow: bez screenshotu"; exit 1; }
chk() { local m; m=$(python3 -I "$ROOT/scripts/png_mean.py" "$F" $2 | awk '{print $1}'); awk -v v="$m" -v lo="$3" -v hi="$4" -v n="$1" 'BEGIN{ if (v>=lo && v<=hi) {print "PASS wb_shadow " n " = " v; exit 0} else {print "FAIL wb_shadow " n " = " v " (čekáno " lo ".." hi ")"; exit 1} }'; }
rc=0
chk cube_front "540 400 570 430" 85 105 || rc=1
chk cube_top "540 345 600 365" 100 115 || rc=1
chk plane_lit "450 470 520 500" 85 105 || rc=1
chk cast_shadow "645 400 655 420" 0 35 || rc=1
exit $rc
