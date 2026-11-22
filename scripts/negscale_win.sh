#!/bin/bash
# H51: záporné měřítko X nesmí ztmavit kostku (Solid) — průměr pixelů kostky s −1 = s +1. Q=webkit_sim=1 funguje. Vyžaduje vite :5173.
ROOT=$(cd "$(dirname "$0")/.." && pwd); export Q WSLENV="Q${WSLENV:+:$WSLENV}"
for sx in 1 -1; do
  sed "s/%SX%/$sx/" "$ROOT/scripts/negscale_test.py.in" > "$ROOT/scripts/.negscale_$sx.py.in"
  TPL=.negscale_$sx.py.in MODE=SOLID SUFFIX=_neg$sx bash "$ROOT/scripts/volume_win.sh" >/dev/null 2>&1
  rm -f "$ROOT/scripts/.negscale_$sx.py.in"
done
A="$ROOT/out/win/vol_SOLID_neg1.png"; B="$ROOT/out/win/vol_SOLID_neg-1.png"
[ -f "$A" ] && [ -f "$B" ] || { echo "FAIL negscale: bez screenshotu"; exit 1; }
rc=0
for r in "540 400 570 430" "540 345 600 365" "620 400 650 430"; do
  a=$(python3 -I "$ROOT/scripts/png_mean.py" "$A" $r | awk '{print $1}'); b=$(python3 -I "$ROOT/scripts/png_mean.py" "$B" $r | awk '{print $1}')
  awk -v a="$a" -v b="$b" -v r="$r" 'BEGIN{d=a-b; if(d<0)d=-d; if (d<=3) print "PASS negscale okno " r ": +1=" a " −1=" b; else {print "FAIL negscale okno " r ": +1=" a " −1=" b; exit 1}}' || rc=1
done
exit $rc
