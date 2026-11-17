#!/bin/bash
# H44 stráž: Principled Volume (Material Preview i Rendered) a průhledná kostka (Blended) se musí vykreslit (průměr pixelů uvnitř kostky),
# i bez dual-source blendingu (regress_sim / Q=webkit_sim=1). Vyžaduje vite :5173.
cd "$(dirname "$0")/.." || exit 1; fail=0
chk() { # soubor podmínka(python výraz nad r g b) popis
  m=$(python3 -I scripts/png_mean.py "out/win/$1" 545 360 610 440); read r g b <<<"$m"
  if python3 -I -c "r,g,b=$r,$g,$b; import sys; sys.exit(0 if ($2) else 1)"; then echo "PASS $3 (kostka RGB $m)"; else echo "FAIL $3 (kostka RGB $m)"; fail=1; fi; }
MODE=MATERIAL SUFFIX=_vb scripts/volume_win.sh >/dev/null; chk vol_MATERIAL_vb.png "(r+g+b)/3>110" "Principled Volume v Material Preview"
MODE=RENDERED SUFFIX=_vb scripts/volume_win.sh >/dev/null; chk vol_RENDERED_vb.png "(r+g+b)/3>72" "Principled Volume v Rendered (prázdná kostka = ~60)"
MODE=MATERIAL SUFFIX=_vb TPL=transp_test.py.in scripts/volume_win.sh >/dev/null; chk vol_MATERIAL_vb.png "r>150 and r-g>60" "průhledná červená kostka (Blended)"
[ $fail = 0 ] && echo "PASS vol_blend" || echo "FAIL vol_blend"; exit $fail
