# WEEKEND — samostatná práce (Lukáš je pryč, iPad netestuje)

You are running unattended in a loop (`scripts/weekend_loop.sh`). Each run is a fresh
session: read `CLAUDE.md`, `docs/STATUS.md`, `docs/PLAN.md` and `docs/BACKLOG.md` first.
Lukáš cannot test on the iPad until he is back — verify everything yourself in Windows
Chrome on the real GPU (`scripts/p2_win.sh`, `scripts/parity_win.sh`).

## Mission now (od 4. 11.) — BACKLOG.md shora dolů
Pracuj podle bloků nahoře v `docs/BACKLOG.md` (nejnovější blok = nejvyšší priorita). Starý cíl "iPad crash / IPAD_CRASH.md" (25. 10.) je HOTOVÝ, neplatí.
Fuzz/`regress_all` jen JEDNOU po změně kódu, nikdy jako výplň času.

## Víkend od so 7. 11.: hlavní úkol = `docs/VELKA_ZKOUSKA.md` (A1 -> A2 -> B1 -> B2), před tím dokonči S1 a H25d. Do pátku 6. 11. NEZAČÍNAT.

## NEKONČIT PŘEDČASNĚ (Lukáš 4. 11.: smyčka se opakovaně ukončila, i když práce byla)
Úkol, který čeká na iPad / Lukáše / vydání 5.3, NENÍ důvod končit. Nejdřív: ASK na iPad max 2× za večer (viz níže), pak ho přeskoč a pokračuj
v této ZÁLOŽNÍ FRONTĚ (jen PC, v pořadí; každou položku buď dodělej, nebo označ `[!] BLOCKED: <proč>` v BACKLOGu):
1. M1 — Blender Web MCP (add-on + relay ve `mcp/`), viz BACKLOG M1
2. O1 — offline PWA: service worker + test v PC Chrome offline (hosting nezakládej, jen kód + test na localhost)
3. 5.3 větev `ipad-5.3-wip`: 6/96 ops FAIL (image save, glTF/FBX export) — do master nic
4. D8 — přepínání MP <-> Rendered po dlouhé relaci (PC repro přes `auto=soak` + `auto=rendered`)
5. Výkon MP na iPadu: jen měření na PC s `?ipad=1` (fps, počet pipeline/draw callů), návrh do STATUS, bez velkých změn
`out/.idle_stop` smíš zapsat JEN když jsou všechny položky výše `[x]` nebo `[!] BLOCKED` a do `.idle_stop` napiš, které to jsou.

## Push
Lukáš povolil (4. 11.): po každém zeleném kroku `git pull --rebase && git push` i do `master` tohoto repa (a fork `ipad` + `BLENDER_REF` jako dřív). Do STATUS napiš, co jsi pushnul. Zip pro itch dál nahrává jen Lukáš.

## How to work
1. Take the first unchecked item in `docs/BACKLOG.md`. Mark it `[~]` (in progress) and commit.
2. Fix it with the smallest change; prove it with a script in `scripts/` (screenshot + PASS line).
3. Commit + push after every green step (blender fork branch `ipad` + update `BLENDER_REF`,
   then this repo `master`). Mark the item `[x]` with the proof line.
4. Same error 2× → ask the `architect` subagent. 3× → mark `[!] BLOCKED: <why>` and move on.
5. Backlog AND záložní fronta (viz "NEKONČIT PŘEDČASNĚ") hotové nebo BLOCKED → write STATUS.md, then `echo "<proč, 1 řádek>" > out/.idle_stop` (smyčka se tím ukončí, nepálit tokeny kontrolami) and END the run (no bug hunting, no performance work this weekend).
6. Never break the build. If a change cannot be made green, revert it and write why in STATUS.md.
7. Before ending a session: update `docs/STATUS.md` top section ("Víkend — co je nového",
   "Co otestovat na iPadu" sorted by importance, "Blocked"). Keep it short, Czech.

## Pravidlo „nejdřív důkaz" (27. 10., po 3 neúspěšných opravách MP)
- Před každou opravou napiš do STATUS **predikci**: „Pokud je příčina X, pak měření M ukáže Y." Oprava se dělá až když M opravdu ukázalo Y. Bez měření žádná oprava.
- Neplatí-li predikce → hypotéza padá, nezkoušej další variantu téže opravy.
- Podezřívej vlastní telemetrii: hodnota, která se nikdy nemění (např. `max_heap` vždy 1024), je spíš chyba měření než fakt. Kde to jde, ověř nezávislým zdrojem (Jetsam log, desktop Blender, Chrome DevTools).
- Po 2 neúspěšných opravách téhož příznaku: STOP, sepiš všechna fakta + rozpory (jen data, bez příběhu) a dej je `architect` subagentovi bez svých hypotéz.

## Živý test na iPadu (Lukáš je u iPadu, telemetrie teče na PC)
Když Lukáš řekl, že je u iPadu (nebo je to den s ním), NEPIŠ jen "vyzkoušej a pošli". Udělej tohle:
1. Ověř, že běží dev server + tunel (`pgrep -af "vite|cloudflared"`); URL tunelu je v logu tunelu. Když neběží, napiš to do `out/ipad/ASK.txt` a končíš.
2. Nasaď build (atomicky), pak napiš JEDNU konkrétní instrukci do `demo/public/ask.txt` ve tvaru `ASK: Material Preview, přetáhni světlo` (iPad ji sám ukáže žlutým pruhem nahoře, jen s `?tel=1`; Lukáš nemusí sledovat PC). Kopii dej i do `out/ipad/ASK.txt`. Bell/echo nepomůže (výstup smyčky jde do logu).
3. Spusť `python3 scripts/ipad_wait.py --max-sec 540` s Bash `timeout: 590000` (jinak se zabije po 2 min!) (blokuje; čte jen nové řádky telemetrie, nestojí tahy). Výstup = abort/lost/error, `rt_phase` + `rt_phase_ms` (visí vlákno?), fps, tex_mb.
4. Po testu vyprázdni pruh: `echo 'ASK:' > demo/public/ask.txt` a na konci práce `rm -f demo/public/ask.txt` (ať nejde do itch zipu). Z výsledku vyvoď další krok sám (oprava / další měření) a opakuj. Max 3 iPad testy za hodinu, ať Lukáše nezahltíš; mezi testy dělej práci na PC (build, testy).
5. Timeout (exit 2) = Lukáš u iPadu není: neopakuj, pokračuj jinou prací z BACKLOGu.
Do STATUS.md piš u každého testu: co jsi čekal, co přišlo (řádek z ipad_wait), co z toho plyne.

## Úklid před koncem běhu (Lukáš 5. 11.: po konci smyčky dál vyskakovala okna Chrome z testů)
Před `out/.idle_stop` i před koncem každého běhu: zastav VŠE, co jsi pustil na pozadí (`setsid nohup` testy, regress, fuzz, vite instance, které jsi spustil ty):
`pkill -f regress_all.sh; pkill -f "_win.sh"; pkill -f fuzz` a Windows Node z testů (`cmd.exe /c "taskkill /IM node.exe /F"` jen když jde o tvé testy). Ověř `pgrep -af "regress|fuzz|_win.sh|_test"` = prázdné a napiš to do STATUS. Dev server a tunel, které spustil Lukáš, nech být.
