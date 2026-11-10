# Týden s Fable (Lukáš má omezený přístup, týden od 16. 11.) — jak ho využít

Fable je nejsilnější agentní model, ale limitovaný. Pravidlo: **Fable jen na to, kde Sonnet/Opus opakovaně selhaly nebo kde
jde o velký zásah přes celý projekt.** Rutinu (cesty, regrese, malé JS opravy) dál Sonnet.

Spuštění (ověř nejdřív název modelu: `claude --model fable -p "ahoj"`):
    MODEL=fable bash scripts/weekend_loop.sh "<deadline>"

## Pořadí úkolů pro Fable
1. **R — přechod na Blender 5.3.0** (tag `v5.3.0` vyšel, ověřeno 10. 11.). Největší a nejrizikovější práce, ideální pro Fable.
   - Výchozí bod: větev `ipad-5.3-wip` (už 96/96 ops, parity 12/0, J1). Přenést VŠECHNY commity větve `ipad` od jejího odbočení
     (WebGPU backend + všechny opravy H*, B3, H25, H26, S1, H35 GMP/Manifold…) na `v5.3.0`, vyřešit konflikty, build.
   - Hotovo když: `regress_all.sh` i `regress_sim.sh` 0 FAIL, prohlídka 75/75 Chrome i sim+ipad, cesty jako desktop **5.3.0**
     (stáhnout desktop 5.3.0 na Lukášovo PC pro 3b srovnání — konečně stejná verze), nový zip, Lukáš potvrdí na iPadu.
   - Po přechodu přetestovat celý seznam chyb (pravidlo 3b: alfa chyby mohly zmizet).
   - Do master až po zelené regresi; stará `ipad` zůstane jako záloha.
2. **B3 — iPad padá po ~57 krocích prohlídky** (device lost `destroyed`, karta 4,3–4,7 GB podle Jetsamu, my vidíme jen 1,1–1,6 GB).
   S Lukášem u iPadu (živé testy přes ipad_wait). Hledat neviditelné ~2,5 GB a plnou frontu GPU (q_depth 16–35 přes bp).
3. **H32c** (ztracené puštění myši během kompilace shaderů -> snap/prop/shading) — evtrace měření + oprava.

## Co má do té doby udělat Sonnet (levné)
- H42a/c test všech operátorů se souborovým dialogem, H43 kolečko v itch iframe, H32c evtrace (jen měření), R1 auto obnova.
