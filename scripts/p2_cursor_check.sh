#!/bin/bash
# P2 test: 3D kurzor se čte z depth snapshotu (ne FAR). Selže, když čtení hloubky netrefí snapshot.
# Pohled zepředu, nástroj Cursor, klik na kostku, pohled shora (screenshot out/win/p2_cursorchk_8_Home.png:
# kurzor musí ležet NA HRANĚ čtverce kostky, ne uvnitř).
cd "$(dirname "$0")/.."
CAPENV='{"WGPU_LOG_DEPTH":"1"}' scripts/p2_win.sh cursorchk Escape,Numpad1,NumpadDecimal,click=29:137,click=600:400,Numpad7,Home >/dev/null
L=out/win/p2_cursorchk.log
grep -q 'WGPU_DEPTHREAD.*snapshot=1' "$L" && echo "PASS: depth read served from snapshot" || { echo "FAIL: depth read got FAR (snapshot=0 / no read)"; grep WGPU_DEPTH "$L" | head -5; exit 1; }
