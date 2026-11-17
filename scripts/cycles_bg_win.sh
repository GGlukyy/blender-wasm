#!/bin/bash
# C1b: Cycles Rendered ve viewportu zobrazuje svět jako desktop 5.3.0 (bez overlayů, výchozí svět 0.05 šedá = ~58/255, oranžový svět (1,.4,.05) = ~186-205,140-153,89-95).
# Příčina (17. 11.): WebGPU FB posílal shaderu srgbTarget=true i pro float cíl -> 3D_IMAGE (Cycles) dekódoval sRGB navíc => tmavé/černé. Pak: Q=webkit_sim=1 také.
ROOT=$(cd "$(dirname "$0")/.." && pwd); U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}; W=/mnt/c/Users/$U/p2win
fail=0
for t in cycles_bg_default_test cycles_bg_test; do
  CYC_PY=$t.py bash "$ROOT/scripts/cycles_win.sh" >/dev/null; cp "$W/out/cyc_shot.png" "$ROOT/out/win/$t.png"
  m=$(python3 -I "$ROOT/scripts/png_mean.py" "$ROOT/out/win/$t.png" 20 200 500 700); echo "$t: $m"
  set -- $m
  if [ "$t" = cycles_bg_default_test ]; then ok=$(python3 -I -c "print(int(45<=$1<=75))"); else ok=$(python3 -I -c "print(int(170<=$1<=225 and 120<=$2<=170 and 70<=$3<=110))"); fi
  [ "$ok" = 1 ] && echo "PASS $t" || { echo "FAIL $t"; fail=1; }
done
exit $fail
