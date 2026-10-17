#!/bin/bash
# Výběr v Solid nesmí vybrat zakrytý prvek (CPU occlusion přes editmesh BVH, editmesh_select.cc).
# Kostka přiblížená (NumpadDecimal), vše odznačeno (Alt+a). Skryté vrcholy (back-bottom) = 663:449,
# viditelný vrchol = 282:219. Screenshoty: out/win/p2_occl*_*_click.png (oranžová tečka = vybráno).
cd "$(dirname "$0")/.."
scripts/p2_win.sh occlhid Escape,Tab,1,NumpadDecimal,Alt+a,click=663:449 >/dev/null
scripts/p2_win.sh occlvis Escape,Tab,1,NumpadDecimal,Alt+a,click=282:219 >/dev/null
echo "Zkontroluj: out/win/p2_occlhid_7_click.png (nic vybráno) a out/win/p2_occlvis_7_click.png (vrchol 282:219 vybrán)"
# Plocha: klik na přední stěnu (400:500) vybere právě ji, ne zadní (nejbližší tečka středu zadní plochy)
scripts/p2_win.sh occlface Escape,Tab,3,NumpadDecimal,Alt+a,click=500:500 >/dev/null
echo "Zkontroluj: out/win/p2_occlface_7_click.png (vybraná přední plocha = oranžová)"
# Box select (tažení) v Solid: obdélník kolem skrytého vrcholu nic nevybere, kolem viditelného ano
scripts/p2_win.sh occlboxhid Escape,Tab,1,NumpadDecimal,Alt+a,drag=630:420:700:480 >/dev/null
scripts/p2_win.sh occlboxvis Escape,Tab,1,NumpadDecimal,Alt+a,drag=250:190:310:250 >/dev/null
echo "Zkontroluj: out/win/p2_occlboxhid_7_drag.png (nic) a out/win/p2_occlboxvis_7_drag.png (vrchol vybrán)"
