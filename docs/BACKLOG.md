# BACKLOG — pořadí = priorita. [ ] čeká · [~] dělám · [x] hotovo · [!] blocked

## 🎯🎯 26. 10. 14:20 — SAFARI ŘEKL PŘÍČINU: `gpuerr: "Failed to evaluate override value"` (H9-0 telemetrie zafungovala)
- Architektova hypotéza (WGSL `override`) je SPRÁVNÁ, ale oprava H9-4 (inline jen `override X: T = EXPR;` bez `@id`) **nestačí** — Lukáš po ní
  (14:07) má pořád zamrzlý overlay ve Wireframe, Material Preview padá (`8tgihv` lost 88 s, předtím 2× gpuerr). Buď existují další tvary
  overrides, které WebKit neumí vyhodnotit (override odkazující na jiný override i S `@id`, override v array size / workgroup_size, bool
  konstanty předávané jako double přes `constants`, …), nebo část shaderů jde mimo opravenou cestu.
- [~] (14:50 JS hotovo v main.js `ovrPatch`, PC wire/shading ERRORS 0, 26. 10. 19:10 parity_win 0 ❌, čeká na iPad) **H14 (PRIORITA 1, nahrazuje ladění tvarů): na webu NEPOSÍLEJ Safari ŽÁDNÉ `override`.** Hodnoty specializačních konstant známe při tvorbě
  pipeline (`spec_entries`) → vygeneruj **specializovaný WGSL text**: každé `override NAME : T (= default)?;` nahraď `const NAME : T = <hodnota>;`
  (a odvozené `override X = EXPR` → `const X = EXPR`, `const` výrazy WGSL umí), vytvoř shader module pro danou kombinaci (cache podle
  `shader + spec_hash`), `d.compute.constants`/`fragment.constants` = prázdné. Platí pro render i compute pipeline.
  Cena: víc shader modulů (EEVEE má víc variant) — měř `seed_verify`/čas překladu; seed může dál obsahovat obecný WGSL, specializace je jen
  textová náhrada (levná). Zapnuto na webu vždy; `?overrides=1` vrátí původní cestu pro srovnání.
- Ověření na PC: `wire_win`, `shading_win` (Material Preview), `parity_win` 0 ❌, a hlavně **0 výskytů `override` v každém WGSL předaném do
  `createShaderModule`** (log/assert). iPad: Wireframe + Material Preview → `gpuerr` nesmí být žádný.
- Pozn.: dost možná je to **i příčina pádu Material Preview** (EEVEE používá specializační konstanty hojně) → H4/H7b/H14 společně.
- Zvlášť: dnes 6 sezení skončilo při startu (`RangeError: Out of memory`, heap 0) — Lukáš měl otevřené 2 Blendery v tabech (jeden cizí
  „Blender Web — Online Blender“). [x] (26. 10. 19:30, `scripts/oom_test.mjs` PASS) Hlášku P87 při RangeError udělej výraznou + text „Zavři ostatní taby s Blenderem“.

## 🎯 H9 POTVRZENO fotkou (Lukáš 26. 10. 11:12): Solid + Overlays ▸ Wireframe → „zamrzne“ overlay
- Po zaškrtnutí Overlay ▸ Wireframe v Solid: na místě objektu zůstane **černá skvrna s oranžovým obrysem výběru z TOHO okamžiku**; objekt pak
  otočený/zmenšený se kreslí správně jinde, mřížka se kreslí, gizmo se začne duplikovat. ⇒ **Overlay framebuffer se od zapnutí wireframe passu
  už nikdy nepřepíše ani nevyčistí** (zamrzlý obrys = důkaz). Viník = **overlay wireframe pass** (`overlay_wireframe.hh`, shader
  `overlay_wireframe*`). Mechanismus nejspíš „1 nevalidní příkaz → Safari zahodí celý command buffer overlaye“.
- Co je na wireframe passu jedinečné (kandidáti, ověř v tomto pořadí):
  (1) **GPU-driven kreslení**: `manager.generate_commands(wireframe_ps_)` + `submit_only` → compute `draw_command_generate` + `DrawIndexedIndirect`
      s `firstInstance` (resource id) → vyžaduje feature **`indirect-first-instance`** (`webgpu_batch.cc:1253` „requested by the harness“) —
      **ověř v iPad telemetrii `adapter`/`features`, jestli ji Safari má a jestli ji device opravdu dostal.** Pozn.: Material Preview (H4/H7b) padá
      HNED PO prvních compute `draw_command_generate` → **možná společná příčina H4 + H9 = GPU-driven cesta draw manageru na Safari.**
  (2) `SAMPLER(0, sampler2DDepth, depth_tx)` — vzorkování `depth32float-stencil8`: musí být view s `aspect=DepthOnly` a NEfiltrovací sampler;
      a nesmí to být textura připojená jako depth attachment téhož passu (WRITE_DEPTH).
  (3) bez X-ray: `GPU_texture_copy(tmp_depth_tx_, depth_tx)` = kopie depth-stencil (v Safari může být přísnější).
  (4) 2 fragment výstupy (`frag_color` + `line_output`) do overlay fb + `DEPTH_WRITE(ANY)` (frag_depth).
- **Ověřeno 26. 10. 13:50 (telemetrie `wa4u55`):** kandidát (1) je VYVRÁCEN — iPad adapter `indirect-first-instance` MÁ a `blender.js` ho zařízení vyžádá (`wanted` → `requiredFeatures`); limity (storage buffery 44, vertex buffery 12) jsou v pořádku. Zbývají (2)–(4), rozhodne až `gpuerr` z iPadu.
- **Audit (2) 26. 10. 13:55 (čtení kódu, bez změny):** depth textura se vzorkuje přes view `aspect=DepthOnly`, formát Depth32Float (`webgpu_texture.cc:~452`), bind-group layout `UnfilterableFloat` + párový sampler vynucen `NonFiltering` (`webgpu_context.cc:~1990-2015`). Podle specifikace v pořádku → (2) nejspíš není příčina. Zbývají (3) kopie depth-stencil (H9-1 už ošetřeno) a (4) 2 výstupy + frag_depth.
- **H9-4 (26. 10. 14:00, odhad od architekta, NASAZENO v `demo/src/main.js`, čeká na iPad):** wireframe/edit-edge/EEVEE shadery mají `override X : T = EXPR;` BEZ `@id` (hodnota počítaná z jiného override) — WebKit bug 275010, nevalidní pipeline = zahodí se celý command buffer. JS přepis při načtení WGSL cache vloží EXPR přímo do použití (7 shaderů v seedu: 71, 83, 152, 154, 159, 161, 177). PC: wire_win ERRORS 0 + správný screenshot, parity 0 ❌, v seedu 0 zbylých computed overrides. Vypínač `?noovfix=1`. iPad A/B: Wireframe s defaultem vs. `?noovfix=1`. C++ varianta HOTOVO 26. 10. 14:10 (fork 3ea461d2, `wgsl_inline_computed_overrides` v `webgpu_shader.cc`, nasazeno; shading_win/wire_win ERRORS 0, parity 0 ❌) → platí i pro shadery mimo seed; `?noovfix=1` vypíná jen JS část.
- Rychlé iPad testy, které to rozliší: `?nocompute=1&tel=1` + Wireframe (když se pozadí/obrys přestane „zamrzat“ (hrany chybět budou) → (1)).
- **H9-0 (gpuerr telemetrie) dělej jako PRVNÍ** — Safari validační hláška řekne přesně který z (1)–(4).

## ❌ H9 X-ray hypotéza VYVRÁCENA (Lukáš 26. 10. 11:03)
- Wireframe BEZ X-ray → pořád černý. Solid S X-ray → funguje správně (průhledný objekt). ⇒ Viník NENÍ X-ray/blit hloubky, je to něco,
  co běží JEN ve wireframe shadingu: hlavně **overlay wireframe pass** (`overlay_wireframe*` shadery — ve wireframe kreslí hrany VŠECH objektů;
  v Solid se nepoužívá, pokud není zapnutý Overlay ▸ Wireframe) a workbench ve wireframe režimu.
- Mechanismus „jedna Safari validační chyba zahodí celý command buffer“ platí dál (gizmo přežije, clear/pozadí ne).
- **Další rozlišovací test pro Lukáše:** Solid + Overlays ▸ **Wireframe** (zaškrtnout, Opacity 1) → když Solid zčerná, je to wireframe overlay shader.
- **Úkol H9-3:** prozkoumej `overlay_wireframe` create-info/shader (vertex pulling ze SSBO? `gpu_attr_load`, flat/noperspective varyingy, `in_front`,
  per-vertex `wd` atributy, line topology bez index bufferu, `GPU_PRIM_LINES` + polyline workaround) a jeho WGSL v seedu; hledej, co Safari odmítne
  (např. storage buffer ve vertex stage — WebGPU limit `maxStorageBuffersInVertexStage` (nový limit, Safari ho může mít 0/menší!), interpolace
  `flat` u integerů, `@builtin(vertex_index)` + `first_vertex`, alignment). Vypiš na PC adapter limity a porovnej s iPad telemetrií (`adapter` záznam).
- H9-0 (telemetrie `gpuerr` z `uncapturederror`) je pořád nejrychlejší cesta k jistotě — udělej první.

## 🧭 H9 s nadhledem (Claude v chatu 26. 10. 11:10) — wireframe černý + duplikující se gizmo
**Co ty dva příznaky spolu říkají (logika, ne hádání):**
- Gizmo se kreslí VŽDY a vidíme ho → kompozice viewportu na obrazovku funguje a hlavní smyčka DRW běží (gizmo kreslí DRW na konci své smyčky
  do overlay framebufferu viewportu, `DRW_draw_gizmo_2d`).
- Gizmo se HROMADÍ → overlay framebuffer se mezi snímky NEČISTÍ. Ten čistí overlay engine na začátku svého kreslení (a kreslí pozadí, mřížku,
  hrany). Černo = barevná textura viewportu se nikdy nenaplní.
- ⇒ **V wireframe se na Safari ztratí VEŠKERÁ práce engines (workbench + overlay) včetně jejich clearů, ale imm/gizmo kreslení přežije.**
  Clear je u nás okamžitý (`execute_pending_clears` otevře prázdný pass), takže „ztracený clear“ by se musel ztratit spolu s celým command bufferem.
- Nejpravděpodobnější mechanismus: **validační chyba WebGPU, kterou Safari hlásí a Chrome/Dawn ne (nebo jinak), zneplatní celý command buffer**
  → při submitu se zahodí všechny passy v něm (komentář v `webgpu_backend.hh`: „validation error POISONS the whole command buffer at submit
  (dropping all sibling passes)“). Nic nespadne, FPS 35, jen se nic nenakreslí = přesně `vak2p5`.
- Co je ve wireframe jinak než v Solid: **X-ray je ve wireframe ve výchozím stavu ZAPNUTÝ** → overlay jede X-ray cestou (in-front depth,
  kopie/blit hloubky, jiné framebuffery, antialiasing čar). Kandidáti na Safari-only validační chybu:
  (a) `WebGPUFrameBuffer::blit` → `copyTextureToTexture` hloubky `depth32float-stencil8` s `aspect=All` — spec povoluje depth/stencil kopii
      JEN pro CELÝ subresource; pokud blit kopíruje jen region (velikost viewportu ≠ velikost textury, např. 1124×715 vs 1125×715 — v telemetrii
      jsou OBĚ velikosti!), je to nevalidní; (b) vzorkování depth textury s filtrovacím samplerem; (c) polyline/wide-line SSBO ve vertex stage.
**Úkoly (pořadí):**
- [x] (hotovo 26. 10. 12:15, fork fc7301c3: PC wire_win ERRORS 0, parity_win 0 ❌; čeká na iPad: v `tel_*.jsonl` hledej `"kind":"gpuerr"`) **H9-0 Zviditelni validační chyby:** každá `uncapturederror` (message z Safari) → telemetrie `kind:"gpuerr"` s textem a jménem posledního passu/shaderu,
  max 20 za sezení. To samo nejspíš ukáže viníka při dalším iPad testu. Zkontroluj i `logs` v `vak2p5`, jestli tam už něco není.
- [x] (26. 10. 12:50, fork 8bb75de3: nevalidní částečná kopie depth/copy_to přes dst se přeskočí s logem `WGPU_FB blit_to depth copy skipped` / `WGPU_TEX copy_to skipped`; PC: wire_win ERRORS 0, parity 0 ❌; na PC se nic nepřeskočilo = není to prokázaná příčina, čeká na iPad `gpuerr`) **H9-1 Audit blitu hloubky (a):** v `webgpu_framebuffer.cc` blit — u depth/stencil formátů kopíruj jen celý subresource se STEJNOU velikostí
  (jinak fallback: draw-based depth copy shaderem, nebo přeskoč s logem). Přidej validaci velikostí do debug logu.
- [x] (26. 10. 13:05: `wire_test.mjs` teď chytá `WGPU_UNCAPTURED` a testuje i Solid + Overlay Wireframe; PC: ERRORS 0, screenshot `out/win/wire_4.png` správně → Dawn žádné porušení spec nehlásí = příčina je Safari-specifická, čeká na `gpuerr` z iPadu) **H9-2 PC repro se Safari-like přísností:** v Chrome zapni `--enable-dawn-features=...`? Nejjistější: v `drag_win`/`shading_win` přidej
  `device.pushErrorScope('validation')` kolem viewport passů ve wireframe a vypiš chyby — Dawn by měl hlásit stejné porušení spec, pokud tam je.
**Rychlý test pro Lukáše (rozliší X-ray hypotézu za 1 minutu):** Wireframe + vypnout X-ray (Alt+Z nebo ikona X-ray v hlavičce) → kreslí se?
  Solid + zapnout X-ray → zčerná? Výsledek zapiš sem.

## 🔬 26. 10. 10:55 — telemetrie `tel_2026-10-26.jsonl`: wireframe = sezení `vak2p5`; OOM při startu = `mr9ubg`, `rfn1fw`, `t030cb`
- **`vak2p5` = pravděpodobně ten černý Wireframe:** běžel 306 s, **35 FPS, žádná chyba, žádná ztráta GPU**, tex 60 MB, buf 9 MB (jako Solid).
  → NEJDE o zaseknutou kompilaci (FPS je zdravé) a nic nespadlo: viewport se **tiše nevykreslí**. Hypotéza H13 (nedokompilované shadery)
  je tím spíš VYVRÁCENA/oslabena. **První úkol: přečti `logs` ve vzorcích sezení `vak2p5`** (WGPU_* hlášky, `uncapturederror`, validace)
  — hledej `rror|nvalid|alid|WGPU_BLEND|skipped|NO_PIPE` a počty pass/draw na vzorek (`passes`, `submits`). Porovnej se Solid
  sezením `qxrdji`. Wireframe v Chrome na PC funguje → hledej, co je v Safari jinak (např. `depth32float-stencil8`, line topology,
  polyline/wide-line SSBO workaround `is_polyline` v `webgpu_immediate.cc`/`polyline_draw_workaround` — **wireframe kreslí hrany přes
  polyline SSBO!** a limity `maxStorageBuffersPerShaderStage`/`maxStorageBufferBindingSize` na Safari, nebo `point_expand_vbo`).
- **Ztlumit duplikaci gizma** (nečištěná plocha při přeskočeném draw) — viz H13 bod 3, to platí dál.
- **`RangeError: Out of memory` při STARTU (12–21 s, heap 0, `start_hang` v t030cb):** to je ten „Loading Blender…“ po pádu/reloadu.
  iOS dá dalších 1 GB wasm paměti, až se starý mrtvý tab opravdu zavře. **Není to chyba wireframe.** Hláška P87 („zavři tab a otevři znovu“)
  musí být vidět: ověř, že se při `RangeError` opravdu ukáže (Lukáš ji neviděl nebo nepoznal) a že je výrazná (celá obrazovka, ne drobný pruh).
  Zvážit: po ztrátě GPU **neposkytovat „Reload“ tlačítko**, ale „Zavři tab úplně (přejeď a zavři), pak otevři znovu“.

## 🖼️ 26. 10. 10:40 — FOTKY z iPadu (wireframe + kurzor štětce) — NOVÁ HYPOTÉZA pro H9 + H11
Na OBOU fotkách je dole banner **„⏳ Kompiluji shadery… (jen poprvé, může to trvat několik sekund)“**.
- **Wireframe:** celý viewport černý (ani mřížka, ani objekty), toolbar/outliner OK; **navigační gizmo vpravo nahoře je rozmazané =
  nakreslené mnohokrát přes sebe** (každý pohyb pohledu přidá další kopii). Znamená to, že se 3D viewport vůbec nepřekreslí (nečistí se pozadí),
  ale gizmo (jiný kód/jiné shadery) se kreslí dál. Odhad: při wireframe se viewport přeskakuje, **dokud se nedokompilují jeho shadery**
  (async compile), a gizmo se kreslí do nevyčištěné plochy.
- **Sculpt F (velikost štětce):** kolem kruhu kurzoru je **černý čtverec** přesně o velikosti ohraničující kružnice (335×335) = quad se
  shaderem/texturou, která se nedokreslila správně — taky během „Kompiluji shadery“.
- **Hypotéza H13 (odhad, ale sedí na obě):** shadery pro **wireframe** a **kurzor štětce (brush cursor)** nejsou ve WGSL seedu (`demo/public/wgsl-cache.json`,
  generuje `scripts/wgsl_seed.mjs`) → na iPadu se překládají/kompilují za běhu; dokud nejsou hotové, draw se přeskočí nebo nakreslí prázdně.
  Dřív `seed_verify` hlásil 55 shaderů mimo seed po změně EEVEE defines → seed je neúplný.
- **Úkoly:** (1) na PC s **vymazanou IndexedDB cache a bez seedu** (cold) zapni Wireframe a Sculpt+F a pořiď screenshot během kompilace i po ní —
  zopakuje se černá/duplikace? (`?nocache=1` nebo smaž IndexedDB v testu); (2) pokud ano → **přegeneruj seed** pro všechny běžné režimy: Solid,
  Wireframe, X-ray, Sculpt (kurzor, štětec, maska), Edit Mode (všechny typy výběru), UV Editing, Weight/Vertex Paint, Overlays, gizmo
  (`wgsl_seed.mjs` + `seed_verify`), cíl: **0 shaderů mimo seed** v těchto režimech; (3) navíc: když draw čeká na shader, **nikdy nenechávej
  region nevyčištěný** — vyčisti na barvu pozadí a přeskoč jen kresbu (a zobraz banner), ať se gizmo neduplikuje; (4) iPad test: wireframe
  počkej ~30 s, jestli se banner ztratí a viewport se vykreslí.
- **H12 (UI ostrost) — ODLOŽENO (Lukáš: nevadí, nech být).** SVG není cesta: Blender kreslí UI sám do jednoho canvasu (text z atlasu písma,
  ikony z bitmap atlasu), prohlížeč SVG nepoužije. Případně jen `?dpr=` přepínač později; nic teď neděl.

## 📱 26. 10. 10:30 — iPad test po H8/H1-B (Lukáš + `qxrdji`, `anacq3`, `yo6b3c`)
**Lukáš:** ✅ **Sculpt už NEPADÁ** (qxrdji: 378 s, tex 65 MB, buf 14 MB). ✅ Magic Keyboard OK. ❌ Wireframe pořád černý + gizmo se duplikuje (fotky pošle).
❌ Material Preview pořád padá (yo6b3c: lost po 32 s, `tex_mb` **610**, `buf_new 531` ale **`buf_destroyed` jen 5** → v MP se buffery NEUVOLŇUJÍ
(živých 526) = stejný vzor jako dřív K3b, tady asi druhý kontext drží encoder / flush se nespustí; spolu s 610 MB textur).
**Nové chyby od Lukáše:**
- [x] (H11a+b HOTOVO 26. 10. 13:50; H11b: `touch.js` — při modálním F/G/R/S/E (klávesa i lišta) Pencil jen posouvá kurzor a zvednutí potvrdí, nemačká LMB; test `scripts/brush_pen_win.sh` mode penmodal→idle, Size 500 potvrzeno; touch_win, touch_modal, pen_pressure, touch_sculpt PASS; čeká na iPad) (H11a HOTOVO 26. 10. 13:25, fork 5a67d7d2: příčina = `GPU_texture_swizzle_set` je v WebGPU backendu no-op, R8 textura radial controlu (`"111r"`, wm_operators.cc) se četla jako (m,0,0,1) = neprůhledný čtverec; teď RGBA8 s vypečeným swizzlem; PC `scripts/brush_win.sh` ERRORS 0, `out/win/brush_1.png` bez čtverce; zbývá H11b Pencil + iPad; POZOR stejná vada u dalších swizzlů: `imbuf/util_gpu.cc:353,490`, `draw_cache_impl_volume.cc:330`, `eevee_lightprobe_volume.cc:428` — zvážit obecné řešení v backendu) **H11 Sculpt: změna velikosti štětce klávesou F** — (a) kolem/uvnitř kurzoru je **černý čtverec** (i s touchpadem; zmenšování/zvětšování jinak
  funguje); (b) **Apple Pencil táhnutí hned zruší** operaci a velikost se skokově zvětší (pen pointer v modálním F/G/S nehandluje `touch.js`
  jako touchpad — zkontroluj `pointerType==='pen'`). Reprodukuj (a) na PC: Sculpt → F → screenshot kurzoru; černý čtverec = textura kurzoru
  štětce (256²/146² z H8-2 cache?) bez alfa/šedé → mohl to způsobit H8-2 (cache `immDrawPixels` textur) — ověř `WGPU_` přepínačem vrácení cache.
- [!] BLOCKED (26. 10. 14:05, fork 2fde6d5d; default `dpr=1` beze změny: parity 0 ❌, tex 64 MB): přepínač `?dpr=N` existuje (JS `window.__DPR__` + GHOST: velikost okna, myš, `native_pixel_size_`), ale NENÍ pro iPad: (1) paměť textur `dpr 1`=64 MB, `1.5`=298 MB, `2`=917 MB (víc než 4×, iPad neunese), (2) UI se při dpr 2 nezvětší (Blender hlásí dpi 144/pixel_size 2, ale kreslí malé; pravé panely prázdné) — nejspíš `U.dpi` se přepíše po prvním snímku; ladění `scripts/dpr_win.sh N`. Nezkoušet na iPadu, dokud nevyřešeno) **H12 UI na iPadu je rozpixelované** (Retina DPR 2, plátno se kreslí v CSS px → zvětšené 2×; M3 to dřív „refutovalo“ jen pro paměť).
  Přidej přepínač `?dpr=1.5|2` (canvas backing store = CSS px × dpr, Blender `resolution_scale`/UI scale přizpůsobit, ať UI nezmizí).
  Změř na PC `tex_mb`/FPS při dpr 2 (4× pixelů viewportu: Solid 65 → odhad ~250 MB) a nech jako **volitelné** (default beze změny), dokud nebude jisté,
  že iPad nepadne. Lukáš otestuje `?dpr=2` ve Sculptu.
- [~] (26. 10. 14:20 měření PC `heapused_mp_win.sh`: část „proč se neflushuje destroy“ je VYŘEŠENA = není to únik: v MP je 347 ŽIVÝCH bufferů, jen 32 MB (205× ~130 KB štítek `/1ac` = trvalé EEVEE buffery), `buf_new` 387 za celé sezení, ne za sekundu; `buf_destroyed` nízké je normální. Zbývá jen TEXTURY 604 MB: rgba16float 2048² 3× 96, viewport rgba16float 10× 65, `fb_dummy_attachment` 8192² 64, depth 9× 36, r32uint 2048² 32; nízko visící ovoce není — dummy zmenšit = max +48 MB a riziko stínů, NEDĚLAT bez iPad dat) **H6b Material Preview 610 MB:** zbývá `fb_dummy_attachment 8192² (64 MB, náš backend — udělej menší)`, 3× `rgba16float 2048²` (~100 MB),
  4× `r32uint 2048²` (64 MB), 15× `rgba16float 1125x715` (~96 MB) + depth 14×. A **zjisti, proč se v MP neflushuje destroy** (`buf_destroyed` 5 z 531).

## 📱 25. 10. 21:45 — iPad test po H1–H7 (Lukáš + telemetrie `c5l0sb`, `8ekvti`, + 1 další)
**Lukáš:** G+tažení přežilo; pak bevel OK; **Sculpt mód → PADÁ**; UV Editing OK (jednou přestala fungovat Magic Keyboard, po přepnutí
tabu a zpět OK); Shading: H7 ochrana funguje (vrací Solid + hláška); s `?mp=1` Material Preview funguje, ale **při opakovaném
zapnutí skoro hned spadne**; **Wireframe shading nefunguje a buguje „viewpoint preset“** (numpad pohledy?) — upřesnění: zeptat se Lukáše.
**Telemetrie:**
- `c5l0sb` (Sculpt, perem `pen:0`): lost ve **156,8 s**, `beginRenderPass: Unable to begin render pass`. `tex_mb` jen 65, buf 44 MB (malé!).
  `buf_new` 4 773 celkem (~29/s, daleko míň než dřív při pádu — 54 000), `bg_new` 86 501 (~530/s), `tex_new` 632 (**166× 256x256 a 106× 146x146
  = textury štětce/kurzoru se tvoří znovu pořád**, ~3/s). → pád NEKORELUJE s počtem vytvořených bufferů; model „kumulativní vytváření“
  už sám nestačí. Možná: celková paměť PROCESU (wasm halda + GPU), ne GPU objekty.
- `8ekvti` (Material Preview, `tex_mb` 401, fps 1): lost ve 439 s po 7 min. Množí se velikosti textur (`401x773`, `720x747`, …
  desítky různých rozměrů = region se přepočítává při každé změně okna/klávesnice/rotaci a pro KAŽDÝ rozměr vznikne celá sada
  offscreen textur, `tex_new` 972). `depth_snapshot` vytvořil 71 bufferů = **109 MB** (H5 nestačí, když se mění velikost).
**Úkoly (pořadí):**
- [x] (HOTOVO: `scripts/sculpt_mem_win.sh` — wasm halda in-use plochých 297 MB (NErůstá); ale `buf_mb` rostlo 9→107 MB/2 min = únik `uniform_arena` chunků v kontextech, které nikdy nepresentují → opraveno v flush_encoder, po opravě 23 MB; fork 1824e0bd, parity 0 ❌, regress 1 náhodný FAIL rna_sweep, samostatně PASS) **H8-0 Měř skutečnou paměť:** do telemetrie přidej **použitou** wasm haldu (`mallinfo().uordblks + hblkhd` nebo `emscripten_get_heap_size`
  vs. in-use; `heap_mb` 1024 je jen rezervace!) a `performance.measureUserAgentSpecificMemory()` pokud existuje (Safari ne). Cíl: zjistit,
  jestli při Sculptu halda roste k 1 GB. Reprodukuj Sculpt na PC (Playwright tahy štětcem 2 min, `scripts/` už má sculpt testy?) a vypiš
  graf: halda in-use, tex_mb, buf_mb, bg_new. **Povoleno udělat nový test jen tento jeden (sculpt+paměť).**
- [x] (HOTOVO: buffer se znovupoužije, pokud je dost velký; drží 2 největší; p2_cursor_check PASS, shading_win ERRORS 0 — na iPadu neověřeno) **H8-1 depth_snapshot:** drž JEDEN buffer podle maxima velikosti (nebo uvolni při změně velikosti), 109 MB → < 10 MB.
- [x] (HOTOVO: příčina = `immDrawPixels` s mipmapou (zmenšený obrázek) se nekešoval; teď keš i pro mip. `sculpt_mem_win.sh`: tex_new 160/2 min → 5/min, parity 0 ❌; fork 1dcda418) **H8-2 Textury štětce/kurzoru ve Sculptu** (256² ×166, 146² ×106): najdi kdo je tvoří (brush cursor / `immDrawPixels`-podobný kód) → cache jako u H3.
- [!] BLOCKED/NEDĚLAT (26. 10. 06:30): `WebGPUUniformBuf::update` dělá copy-on-write záměrně — už nahrané draws v otevřeném passu musí číst starý obsah; kruh 2–3 bufferů by je přepsal (špatné vykreslení textu). Správná cesta = dynamic offset do velké arény pro UBO, což je zásah do správnosti passů za ~165 missů/s (levné) a pád s počtem bg nekoreluje. Riziko > zisk, nechávám do iPad testu. **H1-C měnící se handly (zjištěno 26. 10. `WGPU_BG_WHY=1` + `sculpt_mem_win.sh`, 60 s):** zbylé bind-group missy (~330/2 s) jsou z přepisu bufferů copy-on-write. Nejvíc: `glyphs@gpu_shader_text` (1782 změn handlu — text UI, UBO s glyfy se přepisuje při každém flushi textu), pak `view_buf/drw_view_culling_buf/visibility_buf@draw_visibility_compute` (~208), `matrix_buf/infos_buf/bounds_buf@draw_resource_finalize` (~84), PC arena chunk (~52). Nápad: u `glyphs` držet pro UBO kruh 2–3 pevných bufferů nebo dynamic offset (jako u push constants) místo nové pool-buffer identity při každém update. Nízká priorita; dělat až po iPad testu.
- [x] (HOTOVO 26. 10.: měření `WGPU_BG_WHY=1` — 83 % missů byl offset push constants v klíči; teď dynamic offset → pc_offset missy 2500/2 s → 0; parity 0 ❌, regress_all 67 sekcí 0 FAIL, UI ikony různé; vypínač `WGPU_PC_DYN_OFF=1`; zbývá ~330 missů/2 s z měnících se handlů UBO/SSBO = krok C) **H1-B Dynamic offsets** (bg_new ~530/s ve Sculptu) — nyní odemčeno.
- [x] (NEPOTŘEBNÉ: `texture_pool` už uvolňuje nepoužité po 8 cyklech; `fb_dummy_attachment` 8192² je nutný — shadow pass rasterizuje do viewportu 8192², zmenšení by ořezalo stíny; reálná GPU paměť Material Preview ≈ 330 MB: 3× rgba16f 2048² probes 96, viewport rgba16f ×10 65, dummy 64, depth ×9 36, shadow 32) **H8-3 Region/offscreen sady podle velikosti:** při změně velikosti vieportu uvolni staré sady dřív (`texture_pool` — nepoužité > 2 s zničit).
- [~] (PC: `scripts/wire_win.sh` — Wireframe vykreslí tvary, gizmo se po otočení NEduplikuje → iPad-specifické; chybí data z iPadu: Lukáš ať v Wireframe otevře `?tel=1`, otočí pohled a pošle ID relace) **H9 Wireframe shading na iPadu (Lukáš upřesnil 25. 10. 21:50):** (a) viewport v Wireframe je **celý černý, nevidět žádné tvary**;
  (b) **navigační gizmo (barevný XYZ kříž vpravo nahoře) se po každém pohybu pohledu DUPLIKUJE místo aktualizace** (stará kresba se nepřemazává
  → nejspíš se nečistí/neřeší `loadOp`/clear přesně v tomto režimu, nebo se gizmo kreslí do textury bez clear). Na PC otestuj `shading_win`
  WIREFRAME + screenshot po otočení pohledu (zda se gizmo duplikuje i v Chrome — pokud ne, hledej, co je na iPadu jiné: depth/stencil
  formát `depth32float-stencil8`, loadOp Load vs Clear, `WGPU_BLEND UNMAPPED`, MSAA/anti-aliasing overlay). Pozn.: Lukáš s „viewpoint preset“ myslel
  gizmo, ne numpad. Porovnej s Material Preview/Solid, kde gizmo funguje.
- [~] (bez iPad dat nelze; hypotéza: iOS zabije stránku (jetsam) při přepnutí do MP — wasm halda in-use jen ~370 MB, GPU ~330 MB; `?mp=1&tel=1` + ID relace potřeba) **H7b (opravit H7!):** **s `?mp=1` Material Preview po zapnutí spadne CELÝ Blender do ~2 s, pokaždé** (Lukáš). Ochrana bez `?mp=1` je OK. Pád do 2 s
  po přepnutí = pravděpodobně první snímek (kompilace EEVEE shaderů/compute — viz `ogtllg` abort po `draw_command_generate`, `?nocompute=1`
  zkouška stále chybí). Zkus: iPad `?mp=1&nocompute=1&tel=1`. Mezitím nech ochranu H7 zapnutou i s `?mp=1`
  (na iPadu `?mp=1` stejně vrátit na Solid, dokud nebude oprava) — nebo jasně popiš v hlášce „zatím padá“.
- [x] (HOTOVO naslepo: `demo/src/touch.js` vrací focus na canvas po návratu do appky/tabu a po doteku; touch_win + touch_modal PASS; iPad neověřeno) **H10 Magic Keyboard přestala fungovat** (po přepnutí tabu OK): ztráta focusu canvasu — po `visibilitychange`/`focus` refocus
  `canvas`; zkontroluj `demo/src/main.js` (hidden input pro klávesnici?). Nízká priorita.

- [x] (H7 HOTOVO: `scripts/mpguard_win.sh` 3× PASS — `?ipad=1` → Solid + pruh, `?ipad=1&mp=1` a PC → Material zůstane; jen demo/src/main.js, bez rebuildu) **H7 ochrana Material Preview**

- [~] (H6 krok 1 HOTOVO: EEVEE sphere probe atlas 4096²→2048² (`Probes` a `world_sphere_probe_` 179→45 MB každý, fork 7498d505; PC: shading_win ERRORS 0, vzhled Material Preview OK, parity 0 ❌; regress_all 67 sekcí 0 FAIL; `fb_dummy_attachment` 8192² NEZMENŠENO — viewport musí být uvnitř attachmentu, riziko; zbývá změřit `tex_mb` na iPadu) **H6 snížit GPU paměť Material Preview**

## 🛡️ H7 (Lukáš 25. 10. 19:30, DĚLEJ PŘED H6, je to levné — jen Python/JS, bez rebuildu): ochrana Material Preview na iPadu
Material Preview/Rendered na iPadu zatím padá (790 MB GPU textur). Dokud to neopravíme (H6), na iPadu:
- Python timer v demo startu (kde už jsou timery pro autosave/prefs): detekuj iPad (`navigator.maxTouchPoints>1` + Safari/Macintosh UA,
  předat do Pythonu přes env/flag) a každých ~0,5 s projdi všechny `SpaceView3D`; když `shading.type in {'MATERIAL','RENDERED'}`
  a **není** `?mp=1`, přepni zpět na `'SOLID'` a vypiš hlášku (`self.report`/`bpy.ops.wm.report` nebo JS pruh jako u 💾 Uloženo):
  „Material Preview na iPadu zatím nefunguje (v práci). Zkusit na vlastní riziko: přidej ?mp=1 do adresy.“
- Na PC (Chrome) a s `?mp=1` nic neomezuj. Test: `shading_win.sh` s emulovaným iPad UA → vrátí Solid; bez emulace zůstane Material.
- Po H6: když paměť < ~300 MB a iPad test projde, ochranu vypni (nech `?mp=0` jako opt-out).
- H6 časově omezit: max ~2 hodiny, jen snadné výhry (dummy 8192² → malá, EEVEE shadow pool / probe resolution). Nedaří se → nech na `[!]`.

## 📱 25. 10. 19:30 — iPad test Material Preview (sezení `ytfuf1`, `xieygo`, `cf9hgg`): PŘÍČINA = TEXTURY ~790 MB (EEVEE)
- Ve VŠECH třech sezeních je `tex_mb = 791` (Solid mód měl 38–60 MB). Z toho podle `thist`:
  **3× `rgba16float 4096x4096` ≈ 400 MB**, **`fb_dummy_attachment/r8unorm 8192x8192` ≈ 64 MB (to je NÁŠ backend!)**,
  2× `r32uint 2048x2048` ≈ 32 MB, 12× `rgba16float 1124x715` ≈ 77 MB, 15× `depth32float-stencil8 1124x715` ≈ 70 MB, `r32float 1152x768` ...
- Výsledek: `ytfuf1` lost ve 60 s (GPU první → `createCommandEncoder`), `cf9hgg` lost v 80 s (+ Assertion), **`xieygo` přežil 7,6 min**
  se stejnými 791 MB → hranice není pevná (iOS zabije GPU proces podle celkové paměti zařízení/procesu). `bg_new` jen ~60/s, buf_new ~0
  → H1 vyřešilo vytváření; tohle je jiný problém = **objem živé GPU paměti**. (`ogtllg` abort po compute z 17:55 je jiný pád; zatím
  nevíme, jestli se opakoval — Lukáš tentokrát nepsal o `?nocompute`.)
- **H6 (priorita 1): snížit GPU paměť v Material Preview na iPadu < ~300 MB.** Postup:
  1. `fb_dummy_attachment 8192x8192` (náš kód, webgpu_framebuffer.cc) — proč 8192²? Zmenši na nejmenší nutné (např. 32x32/dle
     největšího attachmentu) nebo sdílej jednu; ušetří 64 MB okamžitě.
  2. Označ ty 4096² rgba16float textury (kdo je tvoří? pravděpodobně EEVEE light-probe sphere/volume atlas nebo shadow atlas;
     v telemetrii mají prázdný label — doplň `GPU_texture_create` jméno do `thist`) a zjisti nastavení, které je zmenší
     (EEVEE: Render ▸ Shadows ▸ Pool Size / Light Probes ▸ Sphere resolution; Python `scene.eevee.*`). Na webu (`__EMSCRIPTEN__`
     / `?lowmem=1`) nastav při startu scény menší hodnoty, pokud jde o výchozí scénu bez .blend nastavení uživatele.
  3. Dál: `depth32float-stencil8` ×15 a `rgba16float 1124x715` ×12 jsou G-buffer/render targets EEVEE — zkus `texture_pool`
     (`webgpu_texture_pool.cc`) používat pro dočasné, ať se neduplikují.
  4. Měř `tex_mb` v `shading_win.sh` (Material Preview na kostce) před/po; cíl < 300 MB, pak iPad test.
- Pozn.: Solid mód je pro modelování malých assetů hlavní cíl a ten teď drží (G-tažení OK). Material Preview je bonus.

- [x] (H5 depth_snapshot: 2 readback buffery se znovupoužívají místo create/destroy; parity 0 ❌; regress_all: 1 FAIL `prefs_sweep` (done=0, známý nestabilní test), samostatně 3× PASS; NASAZENO) **H5 depth_snapshot**

## ⏳ H4 diagnostika NASAZENA (25. 10. 18:30, fork 883a0fa4) — čeká na iPad
- [~] Hotovo: `Module.onAbort` posílá do telemetrie `kind:abort` + JS stack; `compute_dispatch` loguje kroky `WGPU_DISPATCH step #n …` (prvních 16); `?nocompute=1` přeskočí všechny compute dispatche. PC: shading_win (Material Preview) ERRORS 0.
- Zbývá po iPad testu: podle posledního `step` řádku a stacku opravit příčinu.

## 🔎 H4 upřesnění (25. 10. 18:05, log z iPadu `ogtllg`, poslední stderr řádky před abortem)
```
WGPU_DISPATCH entry/#0 shader='draw_resource_finalize'   groups=1,1,1
WGPU_DISPATCH entry/#1 shader='draw_visibility_compute'  groups=1,1,1
WGPU_DISPATCH entry/#2 shader='draw_command_generate'    groups=1,1,1
Aborted(native code called abort())      ← vlákno 0x03fb1a00, blender.js:87
WEBGPU_LOST device lost
```
- To jsou **úplně první 3 compute dispatche v celém sezení** (`webgpu_backend.hh` `compute_dispatch` loguje prvních 16) →
  Solid mód compute nepoužívá; Material Preview je poprvé spustil a hned po `draw_command_generate` přišel abort.
  **Hypotéza (odhad): compute cesta na Safari nikdy neběžela a něco v ní (pipeline, bind group, dispatch, `debug_sum_ssbos`,
  nebo následný krok draw manageru) volá abort().** Na PC (Chrome) compute funguje (parity) → rozdíl je WebKit.
- Úkoly: (1) `Module.onAbort` + `stackTrace()` do telemetrie (JS stack je na wasm abort k ničemu bez názvů funkcí →
  ověř, že link má `-g2`/names nebo přidej `--profiling-funcs` jen do tohoto buildu; případně `emscripten_get_callstack` z
  `abort` handleru), (2) do `compute_dispatch` loguj KAŽDÝ krok (po `compute_pipeline_get`, po `build_bind_group`,
  po `EndPass`, po `flush_encoder`) a zvlášť `WGPU_DISPATCH done #n`, (3) zkontroluj, co dělá draw manager hned po
  `draw_command_generate` (indirect draws? `wgpuRenderPassEncoderDrawIndirect`/`DrawIndexedIndirect` v batch.cc — WebKit
  může mít omezení indirect draw, např. `indirect-first-instance`), (4) přidej `?nocompute=1`/ENV, který compute
  dispatche přeskočí, ať Lukáš na iPadu zjistí, jestli je to to (Material Preview bez compute se bude kreslit špatně,
  ale nesmí abortovat).
- Pak další iPad test: Material Preview na kostce, telemetrie pošle stack.

## 🎉 25. 10. 17:55 — iPad test H1-A/C/H3: G + rychlé tažení UŽ NEPADÁ (Lukáš potvrdil). Zbývá Material Preview.
Telemetrie `out/ipad/tel_2026-10-25.jsonl` (sezení `y7kbmv` 146 s = přežilo G-tažení; `ogtllg` 30 s = Material Preview pád):
- **`ogtllg` (Material Preview, pád ~17 s po startu): `Aborted(native code called abort())` na ts 17560 PŘED `lost` (17561)**
  → opačné pořadí než dřív (tam GPU zmizelo první). Blender abortoval SÁM; `device lost: destroyed` je následek.
  Paměť malá (buf 2 MB, tex 38 MB), `lag_ms 795` (submit trval ~0,8 s — EEVEE kompilace shaderů v Material Preview).
  **H4 = zjisti, KDO volá abort()**: telemetrie nese posledních N řádků stderr (zkontroluj `demo/src/telemetry.js`, jestli
  posílá `console.error`/`printErr`); případně přidej do wasm `abort` hook s JS stackem (`Module.onAbort`) a pošli ho do
  telemetrie. Reprodukuj na PC: Material Preview na kostce (výchozí scéna) v `?tel=1`, sleduj `abort`. Možné příčiny
  (odhady): chyba při překladu/vytvoření EEVEE shaderu (Tint/WGSL, limit bindingů či uniform bufferů iPadu — adapter
  `maxBindGroups=11`), `std::terminate` z výjimky, OOB ve vlákně, malloc selhání. Nejdřív log, pak oprava.
- `y7kbmv`: `depth_snapshot` vytvořil 44 bufferů = **145 MB** (největší jednotlivý spotřebitel), `uniform_arena` 204 × 256 KB = 53 MB;
  **`bg_new` kumulativně 109 788** (~750/s) → H1-B (dynamic offsets) je pořád potřeba. `tex_mb` 215.
  → H5: `depth_snapshot` znovupoužít jeden buffer (nealokovat 3,3 MB při každém snímku).
- Pořadí práce: H4 (abort v Material Preview) → H1-B → H5. Žádný fuzz.

## ▶️ AKTUÁLNÍ ÚKOLY (25. 10.) — první nezaškrtnutý dělej TEĎ, detail v `docs/IPAD_CRASH.md`
- [x] (bg_new≈690/s, view_new≈39/s, buf_new≈1190/s, submit_lag≈0 na PC; docs/MEMORY.md; `drag_win.sh` vypisuje DRAGH1) **H1-0 Změř:** do `drag_win.sh` (a telemetrie) přidej `bg_new/s` (vytvořené bind groups = `g_stat_bindgroups - g_stat_bg_hits`
  nebo JS obal createBindGroup), `view_new/s` a `submit_lag_ms` (onSubmittedWorkDone). Zapiš čísla při G-tažení do `docs/MEMORY.md`.
- [x] (ring HOTOVO: imm_ring 0 nových/s; parity 0 ❌, regress_all 59 sekcí 0 FAIL; ALE buf_new zůstal ~1130/s — histogram: SSBO `/1ac` 620/s, VBO `/ac` 480/s = copy-on-write, ne immediate → viz H1-C; fork 59cb282e) **H1-A Immediate ring buffer** (architekt PŘED): `webgpu_immediate.cc` už nevytváří buffer na každé immEnd; perzistentní
  ring + offset. Cíl: `buf_new/s` a `bg_new/s` výrazně dolů. Pak `parity_win.sh` 0 ❌ + `regress_all.sh` 1× → NASADIT →
  STATUS.md „Co otestovat na iPadu: rychlé tažení plochy“.
- [x] (drag_win 12 s: buf_new 1130→0/s, bg_new 690→59/s, `/1ac` a `/ac` 0/s; parity 0 ❌; regress_all 59 sekcí 0 FAIL; fork 5d0f6d8f; NASAZENO v demo/public, čeká na iPad) **H1-C Pool pro SSBO/VBO copy-on-write** (nový, z histogramu): `wgpu_buffer_acquire` + pool po sekvenčním uvolnění (WGPU_NO_POOL=1 vypne). Cíl `/1ac` a `/ac` ≈ 0/s v `DRAGHIST`.
- [ ] (zatím NEdělat: bg_new už jen ~40/s; vrátit se, jen když iPad po H1-A/C/H3 pořád padá) **H1-B Dynamic offsets** pro uniform arenu / push constants (pozor na starý bug „všechny draw četly první offset“).
- [ ] (zatím NEdělat: submit_lag≈0 na PC; rozhodne iPad telemetrie) **H2 Max 2 snímky v letu**, jen pokud `submit_lag_ms` při tažení roste.
- [x] (zdroj: `immDrawPixels` v `editors/screen/glutil.cc` 495×247 ×20/s; cache 4 textur; tex_new 20→0,1/s; parity 0 ❌; regress_all 59 sekcí 0 FAIL; fork a0720ed8; NASAZENO) **H3 Textury ~30/s** — najdi zdroj, `webgpu_texture_pool`.

## 🧭 25. 10. 10:30 — NOVÝ PLÁN: přečti `docs/IPAD_CRASH.md` a dělej PŘESNĚ to (nahrazuje K3c)
Nejpravděpodobnější příčina = známý bug WebKitu (destroy() neuvolní paměť, dokud ji drží bind group; uvolní až GC).
Pořadí: (1) změř `bg_new/s` + `submit_lag_ms` v `drag_win.sh`, (2) immediate ring buffer (krok A), (3) nasadit + test
pro Lukáše, (4) dynamic offsets (krok B). Architekt před (2). Žádný fuzz, žádné nové *_win testy mimo tento plán.

## 📱 iPad test K3b (Lukáš 25. 10. 10:05, sezení `v9h99q`, `59xpfa`, `5kyvux`) — POŘÁD PADÁ, ale víme víc
- K3b na iPadu FUNGUJE: živých bufferů max **104–245** (dřív 10 645), na konci ~100 / 5–14 MB, textury 60 MB.
  → hypotéza „moc živých objektů“ je **VYVRÁCENA**. Přesto `device lost: destroyed` ve **32,9 s / 39,4 s / 36,8 s** od startu
  (a 23. 10. `w8z38v` 36,9 s). Pád vždy ~33–40 s po načtení při práci; v klidu 3 min OK.
- Co zůstává vysoké: **VYTVÁŘENÍ** objektů. `buf_new` 45–54 tisíc za ~40 s = **~1 200–1 600 nových bufferů/s**,
  `tex_new` ~1 000–1 600 za 40 s = **~30 nových textur/s** (v sezení `5kyvux` jen 218 textur a padlo taky).
- **Nová hypotéza (odhad):** Safari/WebKit GPU proces neuvolní paměť zničeného bufferu hned (MTLBuffer drží JS wrapper do GC,
  nebo WebKit recykluje lazy) → kumulativní objem vytvořeného roste → po ~50 tis. vytvořených bufferech iOS zabije GPU proces.
  Proto pád závisí na **množství práce od startu**, ne na živých objektech ani na čase.
- **K3c = TEĎ JEDINÁ PRIORITA: skoro nulové vytváření za snímek.** Cíl v `drag_win.sh`: `buf_new` < 50/s, `tex_new` ≈ 0/s
  při tažení. Pool z K3 (328→281) nestačil — architekt PŘED začátkem: ring buffer (jeden velký buffer + offsety) pro
  uniform/immediate/vertex streaming (vzor Metal `MTLCircularBuffer`/scratch buffer, Vulkan `VKStreamingBuffer`), znovupoužití
  render-target textur (proč vzniká 30 textur/s? najdi kdo — framebuffer/offscreen při každém překreslení?).
  Navíc v telemetrii přidej `buf_new_mb` (kumulativní MB vytvořených) — ověří hypotézu.
- Pokud K3c srazí vytváření a iPad pořád padá ~35 s → K4 nouzovka, pak rozhodnutí STOP/pokračovat (Lukáš).

## 📱 iPad test K2 (Lukáš 24. 10. 23:35, sezení `w8z38v` + `fkjmt5`) — K2 NESTAČÍ, jdi na K3
- Scénář: G z lišty (keydown g 33,6 s) → tažení prstem → **device lost `destroyed` v 36,9 s = po ~3 s tažení.**
  Pak `createBindGroup: Unable to make bind group` + `Aborted(Assertion failed)` (následek). Lukáš: „hýbe se a padá stejně jako minule“.
- **Klíčové číslo: max živých bufferů na iPadu 10 645** (na PC v K1 max 172!), na konci jen 2302 / 9 MB, textury 60 MB.
  → Na iPadu destroy nestíhá (málo snímků/submitů → fronta k zničení roste). Bajtů je málo, ale **objektů hodně** —
  hypotéza (odhad): iOS/Metal zabije GPU proces kvůli POČTU alokací/objektů, ne MB. To přesně míří na **K3 (pool/ring,
  žádné create za snímek)**. K3 je teď jediná priorita. V K1 testu na PC přidej metriku „max živých“ při zpomaleném
  snímkování (např. CPU throttle v Playwright CDP `Emulation.setCPUThrottlingRate` 4×), ať se iPad napodobí.
- `fkjmt5` (reload po pádu): `RangeError: Out of memory` ve 12,7 s, Blender se vůbec nespustil (heap 0) = **to je
  „visí Loading Blender…“ po pádu**: iOS po pádu nedá znovu 1 GB INITIAL_MEMORY. Až po K3: zkusit menší INITMEM
  (ale POOL nech 32 — viz M4 nález) a/nebo zachytit RangeError v loaderu → hláška „Zavři tab a otevři znovu“.

## 🚨 PŘÍKAZ 24. 10. 22:40 (Lukáš): UŽ NEDĚLEJ FUZZ / REGRESE / VÝKON PC
Poslední 3 hodiny běžely jen testy, K1-K4 jsou pořád nezačaté. Lukášovi dochází týdenní limit.
Dělej TEĎ rovnou K1, pak K2 (strop překreslení ~30 fps, sloučení pointermove v demo/), build, nasazení,
zapiš do STATUS.md "Co otestovat na iPadu: rychlé tažení plochy" a COMMIT+PUSH.
Žádný další fuzz ani nové *_win testy, dokud K2 není nasazená. Pak K3 (architekt první).

## 🏁 CÍL Č. 1 (Lukáš, 24. 10.): RYCHLÉ TAŽENÍ PLOCHY NA iPADU NESPADNE
Test (Lukáš, iPad): kostka → Tab → režim ploch → vyber plochu → G → **prudce táhni prstem přes celou obrazovku
~10 s** → nesmí spadnout. Když tohle projde, je port pro iPad z velké části hotový. Pracuj PŘESNĚ v tomto pořadí
a po každém kroku nasaď build do `demo/public/` jen když je `regress_all.sh` bez FAIL, a zapiš do STATUS.md
„Co otestovat na iPadu“ = tenhle test:
- [x] (měřeno: buf_new ≈1220/s, tex_new ≈23/s, max živých 172; `scripts/drag_win.sh`, docs/MEMORY.md) **K1 Změř na PC** stejný scénář (Playwright: Tab, 3, klik, G, rychlé pohyby myši 10 s): buf_new/s, tex_new/s,
  max živých, submity/s, překreslení/s. Zapiš do `docs/MEMORY.md`. To je náš „teploměr“ pro K2–K4.
- [x] (PASS: touch_modal/boxsel/loopcut/touch; omezeno na 33 ms v `demo/src/touch.js`; čeká na iPad) **K2 Levný experiment: strop překreslení při tažení** (~30 fps, sloučit pointermove/touchmove do 1 události
  za snímek; JS v `demo/` nebo GHOST web). Pokud K1 ukáže výrazný pokles alokací/s → nasadit → Lukáš test.
- [x] **K2b Upstream check** (udělal Claude v chatu 24. 10. 01:10): HeyPuter od 29. 7. jen 2 commity ve forku Blenderu
  (`c1e8e6c` GL backend na „wink“ = Mesa OpenGL přes WebGPU, `fe16888` glTF/FBX add-ony) a 1 v blender-wasm (`e73ddff`).
  **Ve `source/blender/gpu/webgpu/` žádná změna** → k bufferům nic k převzetí. Opustili vlastní WebGPU backend a jdou cestou
  GL→Mesa→WebGPU; to je to, co na iPadu padá (`wink: main-thread runner failed`). glTF/FBX opravy už máme vlastní.
- [x] (K3b HOTOVO 25. 10.: příčina = NEaktivní kontext držel nesubmitnutý encoder po celé tažení; oprava `deactivate()` → `submit()` + destroy podle sekvence (fork e97a363d). `drag_win.sh`: živých bufferů plochých 86 (dřív +300/s do 1639), destroyed 4029/4115; `regress_all.sh` 59 sekcí 0 FAIL, parity 0 ❌. Čeká na iPad.) pool bufferů (out/k3_pool.patch) zvýšil reuse jen z 328→281 buf_new/s; skutečný problém = flush se při tažení nespouští (živých +300/s, destroyed 0), viz MEMORY.md K3. NOVÝ úkol (tip: flush se volá jen z `WebGPUContext::flush_encoder`, `webgpu_context.cc:562`, a vynechá se, když `pass_open()` je true v KTERÉMKOLI kontextu — zkus zalogovat, který kontext při G-tažení drží pass otevřený; telemetrie ukazuje submits=2 / passes=24 na vzorek) **K3b: najdi, proč se při G-tažení neflushuje `wgpu_flush_buffer_frees`** (24. 10. 23:48 ČTENÍ KÓDU, neověřeno: `pass_open()` je true i když kontext jen drží nesubmitnutý `encoder_` (ne jen otevřený pass); `wgpu_flush_buffer_frees` (webgpu_context.cc:120) vrací hned, pokud JAKÝKOLI kontext z `g_all_contexts` něco nahrál. Stačí tedy, aby druhý kontext (DRW/preview/druhé okno) držel encoder po celé tažení → seznamy se nikdy nevyprázdní. Další krok: do `wgpu_any_context_recording` přidat log/čítač (který ctx, `encoder_` vs `render_pass_`) a změřit v `drag_win.sh`; oprava možná = flush_encoder i cizím kontextům před destroy, nebo počítat jen kontexty s otevřeným `render_pass_`; pozor na historii M2, kdy předčasný destroy rozbil kreslení), pak teprve pool. **K3 Znovupoužívání bufferů** místo create/destroy každý snímek (pool podle velikosti / ring pro
  immediate+uniform; vzor Metal `MTLSafeFreeList`, Vulkan buffer reuse). Architekt PŘED začátkem. Cíl K1: buf_new/s
  v klidu tažení ≈ 0.
- [ ] **K4 Nouzovka (jen když K2+K3 nestačí):** na iPadu během modální transformace nekreslit editovanou geometrii
  v reálném čase (jen obrys/kurzor, nebo překreslit max. ~5×/s), plné vykreslení po potvrzení. Přepínač `?lowdraw=1`.
- [x] (HOTOVO 25. 10.: po startu popup „Obnovit poslední práci“ + File ▸ Obnovit poslední práci (autosave); `scripts/restore_win.sh` PASS — 2 běhy se stejným profilem, koule se obnoví; zbývá jen M6 zaseknutí (iOS-only)) (autosave už existoval; výchozí interval 120→30 s, `autosave_win.sh` PASS, uložení 0,02 s; ZBÝVÁ nabídka „Obnovit poslední práci“ po pádu + M6 zaseknutí) **K5 Záchranná síť (paralelně, je to levné JS):** autosave každých 30 s (jen při změně) + po pádu/obnovení
  nabídnout „Obnovit poslední práci“ (`/opfs/home/_autosave.blend`), oprava zaseknutí „Loading Blender…“ po reloadu (M6).
- Rozhodnutí po K2–K4: pokud rychlé tažení pořád padá → STOP iPad (napiš do STATUS.md jasně), PC verze zůstává.
M4 build (8 vláken) NENASAZOVAT: `prefs_sweep` padá ~40 % i s 1 GB (starý 32 vláken 5/5 PASS) → vinu má POOL=8 (24. 10. A/B, viz STATUS). Paměť 512 MB zatím netestována samostatně s POOL=32.

## 🎯 SPRINT „iPad vydrží“ (od 23. 10.) — DĚLEJ V TOMHLE POŘADÍ
Lukáš: na iPadu Blender teď vydrží jen ~15 s až pár operací, pak „GPU se odpojila“ / pád tabu.
Na PC (Chrome/NVIDIA) se to neprojeví → nehádej, MĚŘ. Cíl: 10 minut běžné práce na iPadu bez pádu.
- [x] (PASS: `scripts/tel_win.sh` — 20 vzorků (16 s heap_mb), adapter limits, lost; `out/ipad/tel_<datum>.jsonl`; JS-only. NEPOKRYTO: počet/MB GPU bufferů a reason/message device.lost přijdou s C++ změnou v M2) **M0 Telemetrie z iPadu do PC (bez Macu, bez fotek).** `demo/` posílá každé ~2 s JSON (wasm heap MB,
  odhad GPU paměti: součet živých bufferů + textur v MB a počet objektů, FPS, poslední operace/okno,
  `adapter.limits` jednou na startu, `device.lost` reason+message, `window.onerror`/unhandledrejection,
  `performance.memory` když je) na dev server: Vite plugin `POST /__telemetry` → `out/ipad/tel_<datum>.jsonl`.
  Při `pagehide`/`visibilitychange` `navigator.sendBeacon`. Zapnuto jen přes `?tel=1` (nebo vždy na dev serveru).
  Důkaz: Windows Chrome přes `p2_win.sh` vytvoří jsonl s ≥10 vzorky + simulovaný device lost (gpulost_win.sh) je
  v logu. Na začátku KAŽDÉHO běhu: pokud jsou v `out/ipad/` nové soubory, přečti je jako první (`python3 -I scripts/tel_summary.py`) a vyhodnoť.
- [x] (PASS: `scripts/mem_win.sh`, tabulka v `docs/MEMORY.md`; ZJIŠTĚNÍ: 0 z 10 820 bufferů zničeno přes destroy(), živých ~10 000 po 2 min, uvolňuje jen GC → M2 potvrzena) **M1 Změřit baseline na PC s limity Safari** (`WGPU_CAP_*`): wasm heap a GPU MB po bootu, v klidu 60 s,
  UV Editing + G, Material Preview, Sculpt na Subsurf 2, Monkey Subsurf 3. Tabulka do `docs/MEMORY.md`.
  Klíčová otázka: **roste GPU paměť v klidu?** (Lukáš: padá už po ~15 s.)
- [x] (PASS na PC: `scripts/mem_win.sh` — živých bufferů ~100 místo ~10 000, `destroy()` 10 532 z 10 623; `regress_all.sh` bez trvalého FAIL: utf8 a touch_loopcut spadly jednou v sekvenci, samostatně PASS; parity 12/17/20 PASS. Příčina dřívějších pádů testů: flush destroy po submitu JEDNOHO kontextu zničil buffery, které měl rozepsané jiný kontext (DRW/preview); oprava = flush jen když žádný kontext nenahrává. Čeká na iPad: telemetrie `gpu.buf` musí zůstat plochá) **M2 Hypotéza A — GPU objekty se neuvolňují hned.** V emdawnwebgpu `wgpu*Release` jen pustí JS referenci,
  paměť uvolní až GC; Chrome uklízí rychle, Safari ne → paměť roste, iOS zabije GPU proces. Oprava: explicitní
  `wgpuBufferDestroy` / `wgpuTextureDestroy` před Release všude ve `source/blender/gpu/webgpu/` (staging/readback
  buffery, immediate buffery, depth snapshot P2c každých 120 ms!, dočasné textury). Ověř počítadlem živých
  objektů z M0 (musí být v klidu konstantní).
- [x] (REFUTOVÁNO měřením: `DPR=2 scripts/mem_win.sh` — texturová paměť stejná jako při DPR 1 (49–79 MB), plátno se kreslí v CSS px (`fitCanvas` = innerWidth), ne ×DPR; viz docs/MEMORY.md) **M3 Hypotéza B — velké framebuffery.** iPad kreslí v DPR 2 (2360×1640 → 4× pixelů) × mnoho passů/overlay
  textur. Změř MB framebufferů; zvaž výchozí render scale 1× (UI ostré zůstane) nebo `?dpr=`. Pozor na čitelnost.
- [~] (PC: příčina nalezena a opravena K3b, drag_win živých 86; čeká na iPad) **⭐⭐ SPOLEHLIVÉ REPRO pádu (Lukáš, iPad 23. 10. 23:28) — ZAČNI TÍMHLE.** Kostka → Tab → režim ploch →
  vybrat plochu → **G → rychle hýbat prstem** ⇒ okamžitá ztráta GPU. Klid nepadá, Subsurf nepadá. **Nejde o čas, ale
  o rychlost operací** (počet překreslení s měnící se geometrií za sekundu). Odhad: každý snímek transformace vytváří
  nové VBO/IBO/uniform buffery (create + destroy), WebKit/Metal je nestíhá uvolnit nebo má limit na počet alokací/s →
  GPU proces padne. Telemetrie viděla špičku 6855 živých bufferů před flush. Návrh: (a) reprodukuj na PC: `G` + rychlý
  pohyb myši 10 s, zaloguj buf_new/s a max živých; (b) **znovupoužívání bufferů** (pool/ring podle velikosti místo
  create/destroy každý snímek — viz Metal `MTLSafeFreeList`/buffer pool a Vulkan `VKBuffer` reuse), častější flush;
  (c) zkusit omezit překreslení při tažení na 1× za snímek (coalesce pointermove). Architekt. Ověř iPadem (Lukáš).
- [ ] **Po pádu + Obnovit se skoro vždy zasekne „Loading Blender…“** (potvrzeno znovu 23. 10.) — M6, iOS-only.
  - 25. 10. P87: RangeError Out of memory při startu se zachytí a ukáže „Zavři tab“ (`oomhint_win.sh` PASS, simulace); čeká na iPad.
- [ ] **2D Animation (File ▸ New / workspace) na iPadu hned zamrzne** — nejspíš stejné jako Grease Pencil Monkey freeze.
- [ ] **⭐ VÝSLEDEK iPad testu 23. 10. 22:30 (po M2) — PŘEČTI PRVNÍ.** `out/ipad/tel_2026-10-23.jsonl`, `tel_summary.py`:
  Lukáš: v klidu 3 min bez pádu; pád vždy až při práci (Subsurf 2, sculpt, Ctrl+B…). Relace s Blenderem: ztráta GPU po
  **55 s, 122 s, 208 s** práce (dřív odhadem ~15 s). **V okamžiku pádu bylo GPU objektů málo**: buf 5–24 MB, tex 60–65 MB
  (185–6855 bufferů; 6855 = před flush), destroy funguje (135 735 z 135 920), `buf_gc 0`. wasm heap stále 1024 MB.
  `device.lost` reason = **`destroyed`**, message prázdná; pak `Aborted(Assertion failed)` a chyby createPipelineLayout /
  beginRenderPass / createCommandEncoder (následky). ⇒ **Naše GPU alokace NEJSOU příčina.** Kandidáti (v pořadí):
  (1) `destroyed` = někdo volá `device.destroy()` / wgpuDeviceDestroy (grep fork + emdawnwebgpu; i při chybě/OOM) — ověř;
  (2) iOS zabije GPU/WebContent proces kvůli CELKOVÉ paměti procesu: 1 GB heap od startu + **32 pthread workerů**
  (v Safari může mít každý worker vlastní zkompilovaný kód z 197 MB wasm — Chrome ho sdílí, proto PC test nic neukázal)
  → M4: `POOL=4/8` + `INITIAL_MEMORY` 256–512 MB, každé zvlášť, A/B test na iPadu (Lukáš zavře ostatní appky);
  (3) watchdog dlouhého submitu (M5) — přidej do telemetrie délku posledního submitu/frame a název operace.
  Pozn.: UA Safari na iPadu se hlásí jako „Macintosh“ (desktop mode) — normální.
- [~] (build POOL=8 + INITMEM 512 MB hotový: `mem_win.sh` PASS heap 512, parity bez ❌, ops 96/96, regress_all běží; čeká na iPad telemetrii) **M4 Hypotéza C — wasm heap.** INITIAL/MAXIMUM_MEMORY, růst při operacích, Python (numpy/OpenVDB načtené až
  při použití?), undo paměť (Preferences undo steps/memory limit na webu snížit). iOS Safari tab má odhadem
  ~1,5–2 GB celkem (odhad, ověř z telemetrie).
- [ ] **M5 Hypotéza D — watchdog dlouhého submitu** (Material Preview kompilace, velký sculpt). Pokud telemetrie ukáže
  device lost bez růstu paměti → rozdělit submit / createRenderPipelineAsync. Architekt.
- [~] (částečně: watchdog po 45 s s návodem + `?safe=1` (HOME v paměti, bez OPFS) `scripts/safe_win.sh` PASS; lišta kláves se ukáže až po prvním snímku Blenderu — bar/touch_modal/autokbd PASS; reload po ztrátě GPU na PC naběhne `scripts/reload_lost_win.sh` PASS = na PC se zaseknutí nereprodukuje, iOS zámek OPFS jen odhad; čeká na iPad) **M6** „Loading Blender…“ zaseknutí po pádu (viz níže) a klávesnice při startu (viz níže).
Každá změna: regresní sada `regress_all.sh` musí zůstat bez FAIL. Výsledek každého kroku 1 řádek do STATUS.md
a do „Co otestovat na iPadu“ přesný postup pro Lukáše (s `?tel=1`).

## ⭐ Bugy od Lukáše (iPad Air M1, Safari, 18. 10. večer) — NEJVYŠŠÍ PRIORITA
Test na skutečném iPadu po víkendovém bloku. Start ~11 s (65 MB) + ~5 s. Funguje: výběr kostky, Tab
z lišty, orbit/zoom prstem, G + prst, A/G v UV, Emulate 3 Button Mouse (nepadá), diakritika v Outlineru,
Subsurf 2 na Monkey plynulý, glTF export + import zpět (triangulováno).
- [ ] **ČASTÉ „GPU se odpojila“ (WebGPU device lost) — hlavní problém.** Padá po pár operacích skoro
  všude: UV Editing (A, G, táhnout → po chvíli pád), Material Preview (spadlo; podruhé se kostka
  s materiálem nevykreslila a po změně Base Color na červenou pád), edit mode výběr plochy, G + táhnout,
  Sculpt po Subsurf (pár tahů → pád, jednou ještě před tahem), Subsurf level 3 na Monkey (pád bez hlášky).
  Z-fighting to nejspíš NENÍ. Odhad: paměť (GPU textury / wasm heap po víkendu větší: numpy, OpenVDB,
  Bullet) nebo watchdog dlouhého command bufferu na Apple GPU. NEJDŘÍV ZMĚŘIT: `?perf=1` panel musí
  ukazovat i `maxStorageBuffersPerShaderStage`, maxBufferSize a odhad využité GPU paměti; ať Lukáš může
  vyfotit panel těsně před pádem (konzole na iPadu bez Macu není). Pak architekt. Kandidáti: zmenšit
  textury/pooly v edit/sculpt, uvolňovat buffery, rozdělit velké submity.
- [ ] **Po pádu se další načtení zasekne na „Loading Blender…“** (stejný tab i reload); pomůže zavřít tab
  a otevřít nový. Odhad: OPFS sync access handle / zámek drží mrtvá instance (worker) → nový start čeká.
  Ověřit v Chrome: zabít GPU (gpulost_win.sh) → reload → naběhne?
- [ ] **Při startu sama vyskočí mini klávesnice (lišta) a znovu panel „Launch Blender“** — auto-klávesnice
  (P54) nebo lišta se ukazuje dřív, než má. Při Sculptu lišta zakrývá štětce.
- [x] ~~Ctrl+S → Open „špatný formát“~~ — NENÍ bug (Lukáš 18. 10. 19:43): save/open funguje, jen nevybral
  složku v souborovém dialogu Blenderu. UX: zvážit výchozí adresář `/opfs/home` v File Browseru (Save/Open).
- [ ] **Grease Pencil ▸ Monkey = zamrznutí** (neodseklo se). Odhad: limit storage bufferů Safari (texel buffery).
- [~] (mitigace PASS: `scripts/savednote_win.sh` — po hlášce `Saved "x"` / `Writing to /…` se ukáže pruh „💾 Uloženo“ s tlačítkem do 📁; glTF/FBX exportér cestu nevypisuje → zatím jen .blend/.obj/…; čeká na iPad) **Kam se uložilo .glb?** Export prošel a import ho našel, ale Lukáš nevěděl kde je / jak stáhnout.
  Zviditelnit 📁 prohlížeč souborů nebo po exportu nabídnout stažení.
- [ ] Voxel Remesh na holé kostce „nic neudělal“ — pravděpodobně OK (kostka zůstane kostkou), ověřit s větším
  Voxel Size / po sculptu.

## Bugy od Lukáše (iPad, 17. 10.)
- [~] APLIKOVÁNO `invariant gl_Position` (hypotéza, regresní sada `scripts/regress_all.sh` PASS na PC; čeká na iPad — pokud pořád bliká, napsat) (původně: nejde reprodukovat na PC): **Face select: z-fighting**
  Zkoušeno 17. 10.: Chrome/NVIDIA nemá z-fight (out/win/zf_before.png = zf_after.png, identické). Hypotéza
  `invariant gl_Position` ve WebGPU GLSL patchi je v `docs/patches/zfight_invariant_gl_position.patch`
  (neaplikováno, neověřeno; na iPadu otestovat po aplikaci). Depth bias v webgpu/ není vůbec (grep). Původní popis: — v režimu ploch se vybraná plocha „pere“ s nevybranou
  (overlay plochy a mesh mají stejnou hloubku). Desktop/Metal to řeší depth biasem pro face
  overlay (`overlay_edit_mesh_face`, ndc offset / polygon offset). Ověř, že WebGPU pipeline
  aplikuje stejný offset (depthBias / ndc_offset_factor). Repro: Tab, 3, klik na plochu, orbit.
- [x] (PASS: `scripts/p2_occl_check.sh` — zakrytý vrchol se nevybere, viditelný ano, plocha pod kurzorem: out/win/p2_occlhid_7_click.png, p2_occlvis_7_click.png, p2_occlface2_7_click.png; box/lasso v Solid pořád bez occlusion → nový bod níže) **Výběr skrz objekt** — klik vybere i prvek na zadní straně (dočasné obejití bez occlusion,
  commit a760dba). Oprava bez async GPU select: CPU occlusion test — po geometrickém nearest
  pickingu ověř raycastem (BVH editmesh, `BKE_bvhutils`/`ED_view3d_win_to_segment`), že prvek
  není zakrytý; nebo použij depth snapshot (P2c) a porovnej hloubku prvku s hloubkou pixelu.
  Konzultuj architekta, guard `#ifdef __EMSCRIPTEN__`.

- [x] (PASS: `scripts/p2_occl_check.sh` box — out/win/p2_occlboxhid_7_drag.png nic, p2_occlboxvis_7_drag.png vrchol; lasso/circle stejný kód, netestováno automaticky) Box/lasso/circle select v Solid respektuje zakrytí (`ED_mesh_web_occl.hh`). Occlusion jen vůči aktivnímu objektu.

- [x] (PASS na PC: `scripts/touch_win.sh`; čeká na iPad) **P4 dotyk/Pencil + lišta kláves** — `demo/src/touch.js`.

- [x] (PASS: `scripts/render_write_win.sh` — EEVEE `write_still`, Workbench `write_still` i Save As z Render Result mají alpha 1 a skutečné pixely; fork commit 7224a3a6: zápis souboru se odloží, dokud nedoběhne asynchronní čtení filmu z GPU (`RE_web_flush_pending_write`). NEPOKRYTO: Ctrl+F12 animace (každý snímek se zapíše hned → prázdné), viz níže) **Render do souboru je PRÁZDNÝ** (Lov chyb kolo 65, jen web): `bpy.ops.render.render(write_still=True)` (EEVEE i Workbench) uloží PNG s alpha 0 a rgb ≤ 1/255; `scripts/ops_win.sh` test `render_eevee_to_png` FAIL (`out/ops_run.log`, „black render“). Příčina (odhad z kódu): `WebGPUContext::read_color_sync` (`webgpu_context.cc`) pro 4kanálové čtení vrací nuly (JSPI vypnuté kvůli -fexceptions), pixely se jen kopírují do capture bufferu pro JS (`wgpu_capture_map`). F12 v UI obraz ukáže (GPU), ale Image ▸ Save As / render animace / uložení renderu dají prázdno. Na desktopu OK. Konzultován architekt (kolo 65), plán níže ve STATUS.

- [x] (PASS: `scripts/render_anim_win.sh` — Workbench, EEVEE i INVOKE (Ctrl+F12) zapíšou 3 snímky `f_0001..3.png` se skutečnými pixely; fork 82ae46e8: na webu se animace renderuje po jednom snímku z hlavní smyčky (`ED_render_web_anim_tick`), další snímek až po dokončeném odloženém zápisu. Jen obrazové sekvence; video formáty a sekvencer zůstávají na starém kódu, `R_NO_OVERWRITE`/`R_TOUCH` se v tomto režimu ignorují) **Render animace (Ctrl+F12 / `render.render(animation=True)`) zapisoval prázdné snímky**

- [x] (MITIGACE PASS: `scripts/render_write_win.sh` opengl_reports_unsupported — operátor na webu hlásí „Viewport Render is not supported in the web build yet, use Render Image (F12)“ a nic neukládá. Skutečná oprava = nový bod níže) **Viewport Render (`render.opengl`) ukládal prázdný obrázek** — příčina: `GPU_offscreen_read_color(GPU_DATA_UBYTE)` je synchronní 8bit čtení, `read_color_sync` vrací nuly.

- [!] BLOCKED (odhad příčiny nepotvrzen, vzácné): **Pád wasm: `MEM_delete_void` v `WM_gesture_end` (abort)** — stack: `WM_gesture_box_modal` → `WM_gesture_end` → `MEM_lockfree_freeN` „Attempt to use C-style MEM_delete_void on a pointer created with CPP-style MEM_new“ (po puštění tahu box select). Spolehlivý repro (ddmin zredukoval 240 akcí na 4): `FUZZ_FULL=1 FUZZ_SEED=12 FUZZ_N=241 FUZZ_SKIP=1-213,215,217-238,240 scripts/ui_fuzz_win.sh` → akce 214 (tah z viewportu nahoru přes horní lištu), 216 (klik), 239 (Shift+H), 241 (box select tah). Samostatný skript se stejnými čtyřmi kroky NEpadá (rozdíl neznámý → pravděpodobně závislé na stavu/časování = poškozená paměť jinde, `MEMHEAD` customdata má příznak C++ objektu). Zkoušeno: `but_drag_init`→`WM_gestures_remove` hypotéza (jednoduchý repro B + tah za pole) nepadá. Další krok: build s ASAN/debug není na wasm levný → sledovat; per CLAUDE.md 3b ověřit na desktopu (Lukáš: Shift+H, pak box select tahem; nejspíš upstream). Dopad: pád = ztráta práce od posledního autosave.

## Plán
- [x] **P1** (PASS: `scripts/wgsl_seed_win.sh verify` → TOTAL translations: 0, seed 179 shaderů; BLENDER_REF=f077479e. Příčina: Blender běží na pthread workeru, cache z main.js tam nebyla vidět → nikdy nefungovala; seed se načítá sync XHR. Regenerace: `scripts/wgsl_seed_win.sh seed`, `wgsl-cache.json` je v .gitignore (generovaný). Zbývá iPad: čistá data webu, přepnutí workspace) shader seed (`wgsl-cache.json`) pro všechny workspaces + edit mode + shading módy;
  test: cache-miss = 0 při prvním přepnutí.
- [x] (PASS: `scripts/perf_panel_win.sh`, out/win/perf_panel.png; PC baseline orbit kostky: 43 FPS, 23 ms, submits 13, passes 49, bindgroups 76) **Výkonový panel** `?perf=1`: FPS, ms/snímek, submity/passy, textury, wasm heap.
- [x] (analýzou, odhad) Velikost vrcholů: expanze quadu používá přesně `gl_PointSize` px (= theme.vert × 2 = 6 px), jako desktop; rozdíl je optický (kulatý bod). Na iPadu ověřit okem.
- [x] (PASS: `scripts/blend_open_win.sh` — dobrý 64-bit soubor OK, uměle poškozený (kolize adres) odmítnut s hláškou; fork má stejný `>>3` truncation jako gessa ADR-004; dlouhodobě pointer interning zůstává otevřené) **P2b** riziko korupce 64-bit .blend (gessa ADR-004): ověř + aspoň detektor kolizí.
- [!] BLOCKED na iPad data (PC test PASS: ico sphere 1,3 M trojúhelníků i 5,2 M s limity omezenými jako Safari 256 MiB/128 MiB se vykreslí celá bez chyb, `scripts/highpoly_win.sh 9 ipad`, out/win/hp_9i_orbit.png, hp_10i_orbit.png; 1,3 M = 38 ms/snímek, 5,2 M = 180 ms na NVIDIA. Limity bufferů tedy asi nejsou příčina; podezření: paměť wasm heapu (5 M tris = 2,3 GB) vs limit iOS tabu — potřebuju čísla z iPadu přes `?perf=1`) **P3** high-poly: model 500k–1M trojúhelníků, ověř limity bufferů a čas snímku.
- [x] (WONTFIX, analýzou: bl_pkg downloader.py spouští stahování přes `multiprocessing` `spawn` = nový proces, v prohlížeči nemožné; stub by jen schoval traceback a Extensions by stejně nefungovaly. Řešení by bylo přepsat downloader na vlákno — mimo cíl) `_multiprocessing` chybí → add-on Extensions (bl_pkg) se neregistruje (nízká priorita).

- [x] (PASS: out/win/sculpt_after.png — v asset shelfu jsou skutečné náhledy štětců; příčina: WM job „Loading previews…“ na webu běží synchronně a startuje DŘÍV, než se do fronty vloží požadavek → fronta se nikdy nevyřídila a job se donekonečna spouštěl znovu při každém překreslení; oprava `render_preview.cc` `ED_preview_icon_job`: na webu `PreviewLoadJob::load_jobless`, fork `ipad`) Miniatury štětců v asset shelfu (Sculpt)

- [~] (mitigace PASS: `scripts/ops_win.sh` voxel_remesh_warns — operátor i modifikátor teď hlásí „built without OpenVDB“ místo ticha; samotný OpenVDB build zůstává otevřený) **Chybějící funkce (vypnuto v buildu, `scripts/ops_win.sh` je hlásí jako GAP):** Voxel Remesh / Remesh modifikátor VOXEL (chybí OpenVDB → výsledek prázdný!), Rigid Body (Bullet), Quadriflow. Pro sculpting je nejdůležitější Voxel Remesh — zvážit build OpenVDB pro wasm (těžké: TBB/Boost/blosc), jinak aspoň skrýt/varovat. Dyntopo funguje.

- [x] (hunt 17. 10.: `scripts/ops_win.sh` 56 testů failed=0; nově bisect, poke, remove_doubles, tris↔quads, fill, symmetrize, separate, transform_apply, parent, wireframe/solidify, curve/metaball convert, particle hair, vertex groups, UV pack, undo/redo, float image — vše odpovídá desktopu; žádné nové chyby) Lov chyb kolo 2: modelovací operace
- [x] (hunt: `scripts/uiops_win.sh` PASS — loop cut Ctrl+R, undo, inset, extrude, bevel přes skutečnou myš/klávesy, screenshoty out/win/uiops_*.png; knife K + Enter přes UI také PASS (10/15/7); sculpt viz sculpt_win.sh) Lov chyb kolo 3: nástroje přes UI
- [x] (hunt: `scripts/vpaint_win.sh` PASS — tah myší ve Vertex Paint obarví 422 rohů; dřívější „nemaluje“ byla chyba testu bez Escape/fokusu) Lov chyb kolo 4: Vertex Paint
- [x] (PASS: `scripts/ops_win.sh` png_save_roundtrip; příčina: OIIO `ustring::string()` vracelo PRÁZDNÝ řetězec pro texty ≥ 11 znaků — libc++ hack v `ustring.cpp` neodpovídá emscripten libc++; PNG se vůbec nedalo uložit (F12 render, Save As obrázku, textury, miniatury). Oprava: `scripts/build_oiio.sh` vypne hack pro `__EMSCRIPTEN__`, OIIO přebuildováno) **PNG ukládání nefungovalo** (`tEXt: invalid keyword`)
- [x] (hunt: ops_win.sh image_formats_save JPEG/EXR/TGA/BMP/PNG/HDR PASS, obj/stl roundtrip PASS, render Workbench → PNG PASS) Lov chyb kolo 5: formáty obrázků a IO
- [x] (PASS: `scripts/ops_win.sh` io_gltf_fbx_export + io_gltf_fbx_roundtrip + numpy_basic; numpy 2.3.4 přeloženo staticky (`scripts/build_numpy.sh`, architekt-plán), `_ctypes`/draco/meshopt ošetřeno v add-onu glTF, `time.process_time` v FBX nahrazeno; Draco/Meshopt komprese na webu není) **Export FBX a glTF/GLB** (numpy chybělo)
- [ ] (odloženo 17. 10. večer: oprava = přebuild libpython + relink, nízký užitek; info) (sonda stdlib) Chybí Python moduly: `_lzma`, `_ssl`, `_ctypes`, `fcntl`; `import sqlite3` ZAVĚSÍ (v linku chybí symboly sqlite3_*, `_sqlite3` je jen napůl) → hrozí jen add-onům, které to importují. Nízká priorita; případně sqlite3 z buildu odstranit (rychlá chyba místo zamrznutí).
- [x] (hunt: `scripts/tpaint_win.sh` PASS — Texture Paint tah myší obarví image, uložení do PNG 1073 B, out/win/tpaint.png) Lov chyb kolo 6: Texture Paint
- [x] (hunt: `scripts/wpaint_win.sh` PASS — Weight Paint tah změnil váhy 96 vrcholů, out/win/wpaint.png) Lov chyb kolo 7: Weight Paint
- [x] (PASS: `scripts/mattab_win.sh` + `gpaint_win.sh`; příčina: EEVEE náhledové ikony materiálu/světa/světla se překládají synchronně (~30 velkých pipeline) → první otevření záložky Material zmrazilo UI 6,1 s na PC (na iPadu odhad 15 s+) a přidání Grease Pencil objektu úplně zasekne/shodí stránku; seed shaderů nepomohl (12 s s cache, pipeline compile je pomalý, ne překlad); oprava `render_preview.cc` `ED_preview_icon_job`: na webu se tyto ikony přeskočí (obecná šedá koule), zapnutí `?iconprev=1`) **Zamrznutí při otevření záložky Material / přidání Grease Pencil**
- [x] (PASS: `scripts/gpaint_win.sh` — Grease Pencil tah myší vytvoří stroke) Lov chyb kolo 8: Grease Pencil
- [x] (PASS: `scripts/mattab_win.sh` s CLICK=1111,38 LIMIT=60000 → COMPILE_OVERLAY_SHOWN true; hlavní vlákno stále odpovídá (max mezera 64 ms), Blender se blokuje 6–7 s při prvním přepnutí na Material Preview/Rendered; řešení = hláška „Kompiluji shadery…“ (kanál blender-compile → `demo/src/main.js`); skutečné odblokování by chtělo createRenderPipelineAsync — velký zásah) Přepnutí do Material Preview / Rendered blokuje 6–7 s
- [x] (PASS: `scripts/uvedit_win.sh` — UV Editing workspace: A, G posun UV (součet 8 → 15,5); PŘED opravou pád `Aborted(Assertion failed)` v `WebGPUBatch::record_draw` → `SetVertexBuffer` s uvolněným handlem (VBO copy-on-write vymění WGPUBuffer mezi zachycením handlu a použitím); oprava: před SetVertexBuffer znovu vzít aktuální handle z VBO; log `?drawlog=1`) **PÁD v UV Editing workspace** (a potenciálně jiné náhodné pády při kreslení)
- [x] (hunt: `scripts/anim_win.sh` PASS — klíč I (9 fcurves), posun G X, scrub šipkami; snímek 1 x=0, snímek 13 x=2,057; out/win/anim.png; regress_all.sh po UV opravě bez FAIL) Lov chyb kolo 9: animace
- [x] (hunt: `scripts/wsalive_win.sh` PASS — všech 11 workspaces přepnutých Ctrl+PageDown v edit modu kostky žije a Python timer běží) Lov chyb kolo 10: živost workspaces
- [x] (hunt: `scripts/persist2_win.sh` PASS — .blend uložený do /opfs/home přežije reload stránky, po otevření sedí modifikátor, materiál i pozice) Lov chyb kolo 11: perzistence
- [x] (hunt: `scripts/stress_test.py` přes ops_test.mjs OPS_PY — 30 opic × subsurf 2 aplikovaný = 236 160 polygonů za 2,1 s, 60 undo pushů 0,2 s, undo/redo funguje do limitu 32 kroků (výchozí Preferences; na desktopu stejně)) Lov chyb kolo 12: zátěž
- [x] (hunt: `scripts/compositor_win.sh` PASS — use_nodes + viewport compositor ALWAYS žije; Cycles v nabídce enginů není (jen EEVEE a Workbench), EEVEE render F12 OK) Lov chyb kolo 13: compositor/engines
- [x] (hunt: ops_win.sh 67 testů failed=0 — kolekce+instance, Text Editor run_script, linked duplicate, drivery, constraints) Lov chyb kolo 14
- [x] (analýza 17. 10., `scripts/mattab_win.sh` GAPS: po „WGPU_FLUSH_WHY ssbo_read“ není 4,3 s žádný výstup; Tint/WGSL překlad všech shaderů dohromady 363 ms, createPipeline/Module volání ~0 ms → čeká se na GPU proces, který líně kompiluje ~30 velkých EEVEE shaderů (HLSL/MSL) při prvním submitu, a command buffer proto blokuje zápis; neodstranitelné bez menších shaderů; createRenderPipelineAsync by nepomohlo bez přeskakování draw callů; na iPadu (Metal) se čas může lišit — změřit) Příčina blokace při prvním Material Preview

- [x] (hunt: `scripts/ops_win.sh` 74 testů failed=0 — spin, shrinkwrap+lattice+displace, data transfer, weighted normal, decimate planar, ocean, remesh blocks, curve modifier + bevel; žádná nová chyba, 3 počáteční FAIL byly chyby testů) Lov chyb kolo 15: modifikátory a výběr
- [x] (hunt: `scripts/uiops_win.sh` PASS — navíc Shift+D, Esc, M→At Center, X→Vertices, undo, Tab zpět přes skutečné klávesy/menu; out/win/uiops_7_merge_menu.png, uiops_8_delete_menu.png) Lov chyb kolo 16: duplikace, merge, delete přes UI
- [x] (hunt: `scripts/uiops_win.sh` PASS — G X 2, S 2, R Z 90, G Y -1 s číslem, undo ×2, Esc zruší; out/win/uiops_9_transforms.png) Lov chyb kolo 17: modální transformace v object modu
- [x] (hunt: `scripts/uiops_win.sh` PASS — výběr A/Alt+A/Ctrl+I, skrytí H/Alt+H, klik na vrchol, G Z 1 bez a s proportional editing (O + PageUp; sum z 0,5 → 2,39); out/win/uiops_10_proportional.png; úplný log `out/uiops_full.log`) Lov chyb kolo 18: výběr, skrytí, proportional editing
- [x] (hunt: `scripts/ops_win.sh` 76 testů failed=0 — materiál s node stromem (image/noise → Principled), UV cube/sphere/cylinder projekce, conformal unwrap, image new/scale/pack/pixels) Lov chyb kolo 19: materiály, UV, obrázky

- [x] (PASS: `scripts/utf8_win.sh` — soft-klávesnicové keydown s prázdným `code` a znakem ř/€/š dorazí do Python konzole (`ord('ř')`=345, `len('€š')`=2); před opravou prázdný řetězec; `regress_all.sh` bez FAIL; fork commit 9e618cf5) Lov chyb kolo 41: **znaky mimo ASCII se zahazovaly** (ř, š, ž, €…) — `GHOST_SystemWeb::handleKey` bral jen 1bajtové `key` a klávesy bez `code` (iOS soft klávesnice) úplně zahodil. Teď celá UTF-8 sekvence + klávesa bez code projde jako text.

- [x] (PASS: `scripts/utf8_outliner_win.sh` — přejmenování objektu v Outlineru znaky bez `code` jako soft klávesnice: „příšera“ → název objektu přesně „příšera“; out/win/utf8_outliner.png) Lov chyb kolo 42: diakritika v reálném textovém poli (navazuje na kolo 41)

- [x] (PASS: `scripts/ops_win.sh` 88 testů failed=0 — nově softbody, particles, dynamic paint, Line Art GP, hair curves, Freestyle render; NALEZENO+OPRAVENO: Add ▸ Curves ▸ Empty Hair padal „No asset found … geometry_nodes_dynamics_assets.blend“, protože chyběly 3 node-assety (`geometry_nodes_dynamics_assets`, `procedural_hair_node_assets`, `principal_components`) — doplněno z Blenderu 5.2 do `demo/node-assets/nodes`, THIRD_PARTY.md; GAP: Fluid/Mantaflow vypnutý v buildu (`WITH_MOD_FLUID OFF`) → Physics ▸ Fluid nic nedělá) Lov chyb kolo 43: fyzika, vlasy, Freestyle

- [x] (PASS: `scripts/ops_win.sh` 90/90 — `modifier_assets_add_all`: všech 28 modifikátorů z geometry_nodes_essentials (Smooth by Angle, Array, Scatter…) se přidá a vyhodnotí bez chyby) Lov chyb kolo 44: asset modifikátory

- [x] (PASS: `scripts/templates_win.sh` — po opravě má každá šablona vlastní workspaces (2D Animation: „2D Animation, 2D Full Canvas“; Sculpting; Storyboarding; VFX; Video Editing) a načte se bez pádu, General zpět OK; PŘED: `startup.blend` šablon byly git-lfs ukazatele (131 B) a File ▸ New ▸ šablona nedělala nic; oprava: skutečné soubory z Blenderu 5.2 v `demo/app-templates/`, `link_blender_release.sh` je přepíše; `startup_win.sh` OK 5,6 s) Lov chyb kolo 45: File ▸ New ▸ šablony

- [x] (hunt: `scripts/addons_win.sh` — zapnutí všech 12 přibalených add-onů: 10 PASS (Rigify, FBX, glTF, BVH, SVG, UV layout, Node Wrangler, Pose Library, Hydra, VR preview); 2 známé: bl_pkg (Extensions, WONTFIX `_multiprocessing`) a ui_translate (`_ctypes`, jen nástroj pro překladatele) — nic nového; poznámky: čeština UI nejde (`WITH_INTERNATIONAL OFF`, chybí boost locale → Preferences ▸ Language nic nemění; velký zásah), OCIO view „Khronos PBR Neutral“ a Rec.2100 jsou záměrně ořezané (`trim_ocio.py`, velikost) ) Lov chyb kolo 46: add-ony, chybějící data

- [x] (PASS: `scripts/hidden_win.sh` — CDP `Page.setWebLifecycleState frozen` 8 s (jako když iPad uspí tab) → `active`: Blender po návratu dál kreslí a reaguje na orbit (snímky 26 → 62), 0 chyb stránky; zamrazení tabu je simulace, skutečné zabití tabu iPadem řeší autosave) Lov chyb kolo 47: návrat z pozadí

- [x] (PASS: `scripts/overlays_win.sh` — 70 přepnutí shading/overlay voleb (Wireframe/Material/Rendered, Flat/Matcap/Studio, barvy, X-ray, cavity, stíny, face orientation, grid/osy/extras/stats/kurzor, v edit modu crease/sharp/seams/bevel weight, normály vrcholů/ploch/split, retopology, Subsurf opice) → 0 GPU/Python chyb, žádný prázdný snímek; vizuálně zkontrolováno out/win/ovl/*_split_normals_True.png (normály, švy i crease se kreslí); nepotvrzeno: `overlay.show_statvis` (Mesh Analysis) na kostce nic viditelného nezměnilo — odhad: v 5.3 se zapíná jinak/vybrané plochy ho překrývají, na desktopu neporovnáno) Lov chyb kolo 48: matice overlayů

- [x] (PASS: `scripts/editors_win.sh` — hlavní oblast přepnutá postupně na 17 typů editorů (Image, UV, Sequencer, Node ×4 stromy, Text, Spreadsheet, Outliner, File Browser, Info, Movie Clip, Dope Sheet, Graph, NLA, Console, Properties, Preferences, zpět 3D View): 0 GPU/Python chyb, žádný prázdný snímek) Lov chyb kolo 49: všechny typy editorů

- [x] (PASS: `scripts/bar_win.sh` + `touch_win.sh` ALL PASS; JS-only `demo/src/touch.js`) Lov chyb kolo 50: lišta kláves na iPadu neměla **E (extrude), Space (přehrát), H, I, F2, Ctrl+S**… → přidáno tlačítko ⋯ (druhá řada: E F B C D H I K M N P T Q W, Space, ⌫, F2, F3, . - /, 💾 Ctrl+S); ověřeno: I vloží klíč, Space spustí/zastaví přehrávání, H skryje, E v edit modu vytlačí (8 → 16 vrcholů)

- [x] (PASS: `scripts/touch_modal_win.sh` — G z lišty → tah prstem posune objekt (Δ 14), pohled se neotočí, klepnutí potvrdí a prst zase orbituje; `touch_win.sh` ALL PASS, `bar_win.sh` PASS; JS-only `demo/src/touch.js`) Lov chyb kolo 51: **modální operace prstem** — po G/R/S/E z lišty prst orbitoval místo pohybu kurzoru → transformace byla použitelná jen Pencilem. Teď po G/R/S/E/B/K z lišty (lišta zmodrá) je 1 prst „touchpad“: tah = relativní pohyb kurzoru, klepnutí = potvrdit; Enter/Esc/Tab zrušení režimu

- [x] (PASS: `scripts/touch_loopcut_win.sh` — Ctrl (sticky) + R z lišty → pad: tah prstem najede na hranu, 1. klepnutí umístí řez, 2. klepnutí potvrdí posun, kostka 8 → 12 vrcholů; Knife (K) drží pad do Enter; pad ignoruje sticky Ctrl/Shift; `touch_modal`, `touch`, `bar` PASS; JS-only) Lov chyb kolo 52: loop cut a knife prstem (bez hoveru nešly)

- [x] (PASS: `scripts/touch_boxsel_win.sh` — ⋯ → B: pad s „levým tlačítkem“, tah prstem nakreslí box a vybere 7 z 8 vrcholů (zadní zakryt), pak se pad vypne; `touch_modal`, `touch_loopcut`, `touch` PASS) Lov chyb kolo 53: box select (B) prstem

- [x] (PASS na PC: `scripts/autokbd_win.sh` — dvojklepnutí prstem (CDP touch) na název objektu → editace pole → skrytý `#kbd-input` dostane focus; Esc z lišty ukončí editaci i klávesnici; `touch`, `interactive`, `utf8_outliner`, `startup` PASS; C++: export `blender_web_text_editing()` v `interface_handlers.cc` (textedit_begin/end); odhad: iOS Safari nechá `focus()` z časovače do ~1 s po klepnutí — nutno ověřit na iPadu, vypnutí `?autokbd=0`) Lov chyb kolo 54: **klávesnice se musela vyvolávat ručně tlačítkem ⌨** → teď vyskočí sama při editaci pole

- [x] (PC: soubor se servíruje (200 image/png), manifest je validní JSON, `startup_win.sh` OK; vzhled na ploše iPadu čeká na Lukáše) Lov chyb kolo 55: **ikona na ploše iPadu** — Safari ignoruje SVG favicon → „Přidat na plochu“ dalo šedou miniaturu stránky; přidán `apple-touch-icon.png` (logo Blenderu 180×180 na tmavém) + `<link rel=apple-touch-icon>` + ikona v manifestu

- [x] (odhad, na PC beze změny: nelze ověřit mimo iPad) Lov chyb kolo 56: aplikace z plochy iPadu (PWA fullscreen) měla `black-translucent` + `viewport-fit=cover` a žádné `safe-area` → horní lišta Blenderu (menu) mohla být pod hodinami/baterií a spodek pod home indikátorem. Změněno na `apple-mobile-web-app-status-bar-style=black` a bez `viewport-fit=cover` → rozvržení mimo systémové lišty. Ověřit na iPadu (vrátit lze v `demo/index.html`)

- [x] (PASS: `scripts/ipadview_win.sh` — rozlišení iPad Air 1180×820 DPR 2: lišta s rozbaleným ⋯ byla 296 px vysoká (6 řad, třetina viewportu); teď menší tlačítka + plná šířka = 2 řady, 86 px; snímky out/win/ipad_1.png, ipad_2_more.png; `bar`, `touch`, `touch_modal`, `touch_loopcut`, `touch_boxsel`, `autokbd` PASS) Lov chyb kolo 57: lišta kláves zakrývala viewport

- [x] (PASS: `scripts/uiscale_win.sh` — `?uiscale=1.4` nastaví Preferences ▸ Interface ▸ Resolution Scale (uloží se, vrátit `?uiscale=1`); snímek out/win/uis_big.png: ovládací prvky větší pro prsty, ale pravý panel Properties je při 1180 px úzký (hodnoty se schovají) — proto jen volitelné, ne výchozí; rozhodnutí o výchozí hodnotě nechávám na Lukášovi) Lov chyb kolo 58: malé ovládací prvky pro prsty

- [x] (celá `scripts/regress_all.sh` po kolech 41–58: 0 FAIL / 0 PAGEERROR, `out/regress_k58.log`; do sady přidány utf8, templates, bar, touch_modal/loopcut/boxsel, autokbd, hidden, editors) Regresní kontrola po kole 58

- [x] (PASS: `scripts/touch_shiftsel_win.sh` — edit mode, klepnutí vybere vrchol, sticky Shift + klepnutí přidá 2. a 3., bez Shift výběr nahradí (souřadnice vrcholů počítá Python z view3d); poznámka z ladění: klávesy z lišty platí pro oblast, nad kterou je naposledy známý kurzor — když poslední klepnutí bylo třeba ve vlastnostech, Tab z lišty ve viewportu nic neudělá; chování je záměrné jako u klávesnice, jen to říct Lukášovi) Lov chyb kolo 59: výběr více prvků prstem

- [x] (PASS: `scripts/ops_win.sh` 91/91 — `render_animation_png_sequence`: Render Animation (Workbench, 3 snímky, 64×64) zapíše 3 PNG do `/opfs/home/` (viditelné v 📁); video/FFmpeg výstup v buildu není (jen obrázky)) Lov chyb kolo 60: render animace

- [x] (PASS: `scripts/gizmo_rs_win.sh` — Rotate gizmo: tah prstem na prstenci otočí objekt (rot Z −0,302 rad) a pohled se neotočí; Scale gizmo: tah prstem na úchytu změní měřítko (1 → 1,95); bod gizma hledá test hoverem přes `blender_web_gizmo_hot`; out/win/gizmo_rotate.png, gizmo_scale.png) Lov chyb kolo 61: Rotate/Scale gizmo prstem (Move už v kole 39)

- [x] (PASS: `scripts/quit_win.sh` — Ctrl+Q: Blender vypsal „Blender quit“, runtime se zastavil a na plátně zůstal ZAMRZLÝ poslední snímek bez jakékoli hlášky (+ PAGEERROR memory access out of bounds); teď šedý pruh „Blender skončil … Spustit znovu“ (`showQuit` v `demo/src/main.js`); `startup_win`, `gpulost_win` PASS) Lov chyb kolo 62: File ▸ Quit / Ctrl+Q

- [x] (PASS: `scripts/winops_win.sh` — 18 „globálních“ operátorů (Window ▸ New Window hlásí čistou chybu „Failed to create window“, fullscreen toggle, Load Factory Settings, New/Open/Revert, Recover, splash, menu search, debug menu) bez pádu a bez PAGEERROR; chyby `poll() failed` jsou omezení kontextu timeru; druhé okno na webu není (očekávané)) Lov chyb kolo 63: operátory okna a souborů

- [x] (PASS: `scripts/desktop_open_win.sh` — scéna vytvořená DESKTOP Blenderem 5.2.2 (`scripts/desktop_scene_make.py`: Mirror+Bevel+Subsurf+Array, shape keys, vertex group, materiál s nodes, animace, Geometry Nodes, Text, křivka, armature, Multires, kolekce-instance, custom property, název s diakritikou „BézierCircle“) se ve web buildu otevře a vyhodnocené počty vrcholů, shape keys, fcurves i pozice ve snímku 20 sedí přesně jako na desktopu; soubor `scripts/testdata/desktop_scene.blend`) Lov chyb kolo 64: kompatibilita se soubory z desktopu (Lukáš si bude přenášet práci)

## Výkon (až nebude co opravovat)
- [x] (změřeno 18. 10., PC/NVIDIA, `SCENES=ico6_edit,ico7_edit,monkey_sub2_edit scripts/drawtime_win.sh`: překreslení okna v EDIT MODU: kostka 13,4 ms, ico 40k trojúhelníků 18,8 ms, ico 164k = 32,3 ms, opice+Subsurf2 16,1 ms → pro malé herní assety (<20k tris) edit mode drží ~55 FPS na PC, 164k je na hraně; iPad odhadem 2–3× pomalejší, změřit přes `?perf=1`) Cena snímku v edit modu
- [x] (znovu změřeno po numpy/OIIO/ikonách: `scripts/startup_win.sh` okno nahoře za 5,4 s, bez regrese oproti 5,6 s) Start po víkendových změnách
- [x] (změřeno 17. 10., `scripts/passes_win.sh` = `?passlog=1`; orbit kostky Solid, passy na snímek ÷208 snímků: WebGPUBackbuffer 11, `&framebuffer.fb` 10 (obojí = kompozice UI regionů, ne viewport), overlay_line_fb 4, overlay_output 4, po 2: Clear Main, smaa_resolve, outline.prepass, dfbl overlay, smaa_edge, smaa_weight; po 1: Opaque.Gbuffer/Deferred, Workbench.Outline, taa_accumulation, overlay_line_on, Clear In Front… = ~48) Rozpad passů: víc než polovina jsou kompozice UI (střídání offscreen region ↔ backbuffer = nutné lámání passů); zisk by dalo jen cachování/slučování kompozice regionů (zásah do upstream UI kódu, nejisté) → neřeším, dokud iPad nepotvrdí, že je to úzké hrdlo (`?perf=1`).
- [x] (měřeno 17. 10., PC/NVIDIA, `scripts/drawtime_win.sh`, `scripts/profile_win.mjs` + `profile_window.py`) **Cena snímku**: překreslení okna = 13,4 ms (kostka) / 14,2 (Monkey+Subsurf 3) / 14,7 (ico 327k tris) → cena je skoro NEZÁVISLÁ na scéně, je to pevná režie UI + ~50 render passů + ~900 WebGPU volání. V profilu je ~60 % snímku JS↔wasm lepidlo emdawnwebgpu (`get`, `getWasmTableEntry`, `_wgpuQueueWriteBuffer`, `CreateBindGroup`, `CreateBuffer`), samotný draw/submit jen ~1,5 ms. [OPRAVA 17. 10., `scripts/regions_win.sh` (?perf=1&reglog=1): při orbitu se překresluje JEN hlavní region 3D view (208 překreslení / 200 pohybů myši), headery a panely NE → nápad (a) „nepřekreslovat headery“ je zbytečný; ~49 passů/snímek je samotný viewport (overlaye, gizmo, EEVEE).] Nápady (nezkoušeno): (a) při modal navigaci nepřekreslovat headery (listener skip), (b) menší počet bind groups/passů, (c) sdružit immediate buffery (jen 10/snímek → malý přínos).
- [x] (změřeno 17. 10., PC: `scripts/uploads_win.sh`, nové počítadlo `writes=` v řádku WGPU_STATS: orbit 408 snímků: 169 `writeBuffer` / 205 KB na snímek, žádný upload > 64 KB → mesh buffery se NErenahrávají každý snímek; bind-group cache hit ~30–40 %, 15 submitů/snímek. Drobné zápisy (uniformy) jsou jen ~20 % ze ~900 volání; sloučení by dalo odhadem 1–2 ms z 13) Zbytečné re-uploady bufferů každý snímek? Pipeline cache hit rate?
- [x] (PC localhost, čistý profil, `scripts/startup_win.sh`: stažení 2 s, od Launch po první obsah 2,9 s, celkem 5,6 s; na iPadu dominuje stahování ~200 MB při první návštěvě, další start jde z cache — změřit na iPadu) Čas startu: kde se čeká (stahování, rozbalení, Python init, shadery) → zrychli největší.
- [x] (změřeno 17. 10. večer, PC/NVIDIA, `scripts/drawtime_win.sh` (`SCENES=cubes200,monkeys50` volitelně): překreslení okna: 1 kostka 13,0 ms, 200 kostek 13,2, 50 opic 13,5, opice+Subsurf3 15,1, ico8 17,7 → cena roste jen s trojúhelníky, ne s počtem objektů; pevná režie UI zůstává ~13 ms; žádný nový hotspot) Škálování s počtem objektů
- [x] (změřeno 17. 10. večer, `scripts/ops_win.sh` OPS_TIMING: ico sphere 81 920 polygonů, .blend 2,1 MB: uložení 0,03 s, otevření 0,03 s; ops_test 77 testů failed=0) Čas uložení/otevření většího .blend — žádný problém. Poznámka: po `open_mainfile` z Python timeru dělá `select_all+delete` v testu neúplný úklid (staré objekty zůstaly) — odhad: omezení kontextu timeru, ne chyba portu; nepotvrzeno na desktopu
- [x] (zátěž 17. 10. večer, `WSLENV=STROKES STROKES=40 scripts/sculpt_win.sh`: 40 tahů po 30 krocích myši na kouli 2562 vrcholů = 27 s (≈19 ms na krok včetně režie Playwrightu), bez chyb/pádů, geometrie se mění (maxr 1,34, sumz 0,92); PASS) Delší sculpt tah
- [x] (změřeno 17. 10. večer, PC/NVIDIA, `WSLENV=STROKES:ICO STROKES=n ICO=k scripts/sculpt_win.sh`: tah (30 kroků myši) na kouli 2 562 vrcholů = 685 ms, 40 962 = 737 ms, 655 362 vrcholů (1,3 M trojúhelníků) = 842 ms, bez chyb; cena tahu skoro nezávisí na rozlišení → úzké hrdlo je vstup/UI, ne sculpt; iPad změřit) Sculpt na vysokém rozlišení
- [x] (PASS: `scripts/matcolor_win.sh` — checklist 22: červený materiál je vidět v Material Preview (13 114 červených px) i Rendered (10 510) oproti Solid (1 419 = jen obrys + osa); out/win/matcolor_material.png, matcolor_rendered.png) Lov chyb kolo 20: barva materiálu ve viewportu
- [x] (PASS: `scripts/uikey_win.sh` — checklist 21: Tab, A, U → menu → S → dialog „Smart UV Project“ se otevře (out/win/uikey_2_dialog.png) → Enter → UV 0..1 v edit modu; pozn.: kostka má UV už výchozí, důkaz funkčnosti dialogu je screenshot) Lov chyb kolo 21: Smart UV Project přes UI
- [x] (17. 10. večer: celá `scripts/regress_all.sh` bez jediného FAIL — parity, ops 77/77, undo, interactive, sculpt, touch, occl, blend_open, files, seed_verify (0 překladů, seed 198 shaderů); log `out/regress_night.log`) Regresní kontrola po kolech 15–21
- [x] (PASS: `scripts/prefs_win.sh` — Edit menu, Edit ▸ Preferences (celoobrazovkové s „Back to Previous“, out/win/prefs_1b_prefs.png), Shift+A Add menu s podmenu (prefs_2_addmenu.png), File ▸ Open přes nativní dialog (už pokrývá `open_file_win.sh`); 0 chyb stránky) Lov chyb kolo 22: menu a Preferences
- [x] (PASS vizuálně: `scripts/nodes_win.sh` — Shading workspace: shader editor s Principled BSDF → Material Output, Material Preview s HDRI, file browser; Geometry Nodes workspace: spreadsheet 8 vrcholů, node editor, modifikátory; 0 chyb; out/win/nodes_shading.png, nodes_geonodes.png) Lov chyb kolo 23: node editory
- [x] (PASS: `scripts/console_win.sh` — Scripting workspace, Python Console přes skutečné psaní: `6*7`→42, `import math; math.sqrt(144)`→12.0, `len(bpy.data.objects)`→3; Python 3.13.13; out/win/console_2_typed.png) Lov chyb kolo 24: Python Console
- [ ] (kosmetika, nízká priorita, odhad: pravděpodobně i na desktopu) V Info editoru po přepnutí workspace je řádek `bpy.data.window_managers["WinMan"]. = bpy.data.workspaces["Layout"]` — chybí název vlastnosti za tečkou (out/win/console_2_typed.png dole). Před případnou opravou porovnat s desktop Blenderem (Lukáš: přepni workspace a podívej se do Info editoru ve Scripting)
- [x] (PC: `WSLENV=SHADING:TEXLOG SHADING=MATERIAL TEXLOG=1 scripts/perf_panel_win.sh` (TEXTOP = největší textury): **Material Preview/Rendered alokuje 1080 MB GPU textur** (Solid jen 67 MB); `shadow_atlas_tx_` 2048×2048×32 = 512 MB (EEVEE Shadow Pool default 512 MB) + 2× Probes 85 MB. Oprava v JS: `demo/src/main.js` nastaví při startu a při File ▸ New Shadow Pool 128 MB (`?shadowpool=512` vrátí původní) → 696 MB (−384 MB). Stejně 64 MB → 632 MB. `matcolor_win.sh` PASS, `mattab_win.sh` PASS. Soubory otevřené z disku si drží vlastní hodnotu. Čeká na iPad: Material Preview na čistých datech nespadne / je stabilnější; vzhled stínů) Paměť Material Preview
- [x] (zkoumáno 17. 10. večer: zbytek Material Preview paměti = 2× Probes/world_sphere_probe 4096² (85 MB, `gi_cubemap_resolution` je NEMĚNÍ, pevná velikost atlasu v EEVEE) + dlouhý ocas textur velikosti viewportu (~3 MB × desítky; normální). Žádná další levná úspora v JS; `perf_panel_win.sh` má proměnné `TOPN`, `PYX` pro další pokusy) Paměť Material Preview, zbytek
- [x] (PASS: `scripts/outliner_win.sh` — Outliner: klik vybere, Ctrl+klik rozšíří výběr (pozor: Playwrightovo `click({modifiers})` nestačí, test drží Control přes keyboard.down), dvojklik přejmenuje (Cube→Box); out/win/outliner_1_renamed.png) Lov chyb kolo 25: Outliner
- [ ] (nepotvrzeno, odhad: spíš pravidlo Blenderu nebo chování syntetické myši než chyba portu) Outliner drag&drop Light na objekt Box neudělá parent: tah se spustí (out/win/outliner_2a_during.png), ale tooltip říká „Move inside collection“ a po puštění nic. Ověřit na desktopu stejným tahem; případně na iPadu prstem/Pencilem. Parent přes Ctrl+P (ops_win.sh parent_and_origin_set) funguje.
- [x] (PASS: `scripts/timeline_win.sh` — Timeline přes UI: klik na pravítko → snímek 61, Shift+Šipka vlevo → 1, I + G X 3 + I → animace, návrat na 1 → x=0, snímek 49 → x=3, přehrávání mezerníkem (snímek 84→97), zastavení; out/win/timeline_1.png; pozn.: v Blenderu 5.x je akce vrstvená, `action.fcurves` už neexistuje — testy Pythonu to musí brát v potaz) Lov chyb kolo 26: Timeline
- [x] (PASS: `scripts/leak_win.sh` — 5 kol (15× Tab edit/object + Layout↔Shading), GPU textury ustálené: 634 MB/129 tex → 606 MB/117 tex a dál beze změny, žádný únik; wasm heap panel ukazuje jen velikost paměti 1024 MB, ne využití — úniky wasm heapu tím nezměřeny) Únik GPU paměti při opakovaných operacích
- [x] (PASS: `scripts/heap_win.sh` — 13× vytvořit+smazat ico sphere 655 362 vrcholů (~100 MB každá) s purge orphans: wasm heap zůstal 1024 MB (nerostl, kdyby unikalo ~1,3 GB, paměť by narostla); `bpy.app` neukazuje využití heapu, jen `memory_usage_undo`) Únik wasm heapu
- [x] (pozorování 17. 10. večer: ico sphere 655k + Subsurf modifikátor vytvořený přes Python v timeru zavěsí Blender >4 minuty — 1,3 M trojúhelníků × subsurf = ~5 M; na desktopu by to také trvalo, nepovažuji za chybu portu; nezkoumáno)
- [x] (PASS na PC: `scripts/touch_sculpt_win.sh` — Pencil (pointerType pen, přes CDP) v Sculpt módu mění geometrii (maxr 1 → 1,0212) a neotáčí pohled; 1 prst v Sculpt módu orbituje a nesculptuje; čeká na skutečný Pencil/prst na iPadu) Lov chyb kolo 27: Pencil vs. prst ve Sculptu
- [x] (PASS na PC: `scripts/vpaint_pen_win.sh` — Vertex Paint tah Pencilem (CDP pen, ?touch=1) obarvil 422 rohů, stejně jako myš; čeká na skutečný Pencil) Lov chyb kolo 28: Pencil ve Vertex Paint
- [x] (PASS na PC: `scripts/export_ui_win.sh` — File ▸ Export ▸ glTF 2.0 přes UI: dialog se otevře (celoobrazovkový, výchozí složka `/opfs/home/`, jméno Untitled.glb, „Back to Previous“; out/win/exportui_3_dialog.png), klik na „Export glTF 2.0" → `/opfs/home/Untitled.glb` 1 936 B; menu obsahuje i FBX/OBJ/STL/PLY) Lov chyb kolo 29: export do hry přes UI
- [x] (zkoušeno 17. 10. večer, nepřevedeno na test: File ▸ Save As / Ctrl+S v Chromiu otevře nativní výběr složky (`showDirectoryPicker`, `__blenderSaveHook` v `demo/src/main.js`), který vyžaduje skutečné kliknutí uživatele → Playwright ho nespustí a canvas zůstane beze změny; uložení .blend je proto testované jen přes Python (`persist2_win.sh`). Na iPadu (Safari) jde cesta stažení blobu (`__blenderSaveDownload`) — ověřit ručně: Ctrl+S / File ▸ Save As → soubor se stáhne) Uložení přes UI
- [x] (PASS: `scripts/ops_win.sh` 81/81 — nové: multires_subdiv_apply, remesh_blocks_modifier, sequencer_add_color_strip; Cycles v buildu NENÍ (render engine jen EEVEE/Workbench) → zapsáno jako GAP `cycles_engine`, dle CLAUDE.md Cycles není cíl; dyntopo přes exec nejde otestovat bez okna, pokrývají ho timer testy sculptu) Lov chyb kolo 30: multires, remesh, sekvencer, Cycles
- [x] (PASS: `scripts/resize_win.sh` — okno 1180×820 → 820×1180 → zpět → 700×500 při DPR 2: Blender se vždy správně přeloží (out/win/resize_port.png, resize_small.png), orbit po všem funguje; OPRAVA: `fitCanvas` v `demo/src/main.js` házela InvalidStateError při každém otočení (canvas už je offscreen) → try/catch; chyba stránky zmizela) Lov chyb kolo 31: otočení iPadu / změna velikosti
- [ ] (odhad, ke zvážení: canvas má backing store v CSS pixelech, tj. DPR 1 na iPadu s DPR 2 → obraz může být měkčí; je to rychlejší; změna = render ve 2× rozlišení, cena výkonu; Lukáš ať posoudí ostrost na iPadu; rozbor: velikost bere `GHOST_SystemWeb.cc` (`emscripten_get_element_css_size`, řádky ~164, ~330) → pro Retinu by bylo potřeba ×DPR pro backbuffer/okno, ÷DPR pro souřadnice myši/dotyku a vyladit UI scale; zásah do C++ + relink, 4× víc pixelů na iPadu; nedělat bez potvrzení od Lukáše, že je obraz měkký) Ostrost UI na Retině
- [x] (PASS: `scripts/autosave_win.sh` — po změně scény se každých N s (`?autosave=10` v testu, výchozí 120 s) zapíše `/opfs/home/_autosave.blend` (viditelný v 📁), obsahuje nový objekt; zápis 0,02 s; předchozí session se při startu přejmenuje na `_autosave_prev.blend`; startup_win PASS) Lov chyb kolo 32: **ztráta práce** — Blenderův vlastní autosave na webu nezapsal NIC (ověřeno 3 min při intervalu 1 min, ani do /tmp, ani do OPFS; příčina nezkoumána, C++), /tmp je navíc v paměti a iPad Safari zabíjí tab na pozadí. Řešení v JS (`demo/src/main.js`, python timer, jen když `is_dirty`, interval se prodlouží u pomalých zápisů). Sculpt s autosave každé 2 s (`WSLENV=STROKES:QS STROKES=40 QS=?autosave=2 scripts/sculpt_win.sh`): 40 tahů PASS, bez pádu.
- [x] (PASS: `scripts/gpulost_win.sh` — skutečný pád GPU procesu (CDP `Browser.crashGpuProcess`) → červený banner „GPU se odpojila… Obnovit“ s odkazem na autosave; fork commit 6f1b18e6, `BLENDER_REF` aktualizován; startup_win PASS) Lov chyb kolo 33: ztráta WebGPU zařízení (iPad při tlaku na paměť / přepnutí aplikace) dřív = tiše zamrzlé plátno. Zařízení si žádá C++ (`creator.cc`, pthread worker) → hláška přes stderr → `showGpuLost` v `demo/src/main.js`. Poznámka: build po změně `creator.cc` trvá ~25 min (1130 kroků ninja).
- [x] (PASS: celá `scripts/regress_all.sh` po novém buildu (creator.cc) bez FAIL/PAGEERROR; seed_verify v regresi 4 překlady (wpaint 2), při samostatném `wgsl_seed_win.sh verify` 0 → ne regrese, kolísání při běhu po jiných testech) Regresní kontrola po kole 33
- [x] (PASS: `scripts/blur_win.sh` — Shift+Ctrl držené při `blur` okna → do okna přijdou syntetické keyup (ShiftLeft, ControlLeft); `interactive_win.sh` ALL PASS; změna jen v `demo/src/main.js`; ověřeno jen na úrovni JS eventů, ne vizuálně v Blenderu) Lov chyb kolo 34: zaseknutý Shift/Ctrl po přepnutí aplikace (keyup se při ztrátě fokusu nikdy nedoručí; iPad s externí klávesnicí, Cmd+Tab)
- [x] (PASS: `scripts/clip_win.sh` — Python `wm.clipboard` set/get uvnitř, Blender→`navigator.clipboard`, vnější text přes `paste` event i skutečné Ctrl+V dorazí do Blenderu; `interactive_win.sh` ALL PASS; fork commit 45a95687) Lov chyb kolo 35: **schránka nefungovala vůbec** (`GHOST_SystemWeb::getClipboard` vracel nullptr, `putClipboard` nic) → Ctrl+C/Ctrl+V v polích, textovém editoru, Python konzoli nedělalo nic. Oprava: in-process řetězec + zrcadlení do navigator.clipboard + `paste` event → `blender_web_set_clipboard`; Ctrl+V už se v main.js nepřeruší preventDefaultem. Omezení: Safari může při zápisu/čtení ze schránky ukázat „Vložit“ bublinu; vložení z vnějšku jde jen přes Ctrl/Cmd+V (ne přes menu).
- [x] (PASS: `scripts/prefsave_win.sh` — i zapnutý add-on Node Wrangler se po reloadu načte; 2 běhy se stejným profilem: ui_scale 1.25 nastavené v 1. běhu je ve 2. načtené; `interactive_win.sh` ALL PASS) Lov chyb kolo 36: **Preferences se ztrácely** (`--factory-startup` nečte userpref a na webu není „quit“, který by je uložil). Teď: start načte `/opfs/home/.config/blender/5.3/config/userpref.blend`, timer každých 5 s uloží, když `preferences.is_dirty`. Reset: `?resetprefs=1`. Pozor: změní se tím chování i pro testy se stálým profilem (jen prefsave_test používá persistent context).
- [x] (PASS: `scripts/urlopen_win.sh` — `bpy.ops.wm.url_open` (Help ▸ Manual…) → stránka dostane `WEB_OPEN_URL` a zavolá `window.open` (Blender přidá `?utm_source=…`); `interactive_win.sh` ALL PASS; test stubuje window.open, skutečné otevření karty bez gesta uživatele blokuje prohlížeč) Lov chyb kolo 37: odkazy z Blenderu (Help ▸ Manual, Python API…) nic neotevřely (`webbrowser.open` → False). Oprava v JS/Pythonu (`demo/src/main.js`). Na iPadu: Safari může popup zablokovat, pokud se `window.open` zavolá > ~1 s po klepnutí.
- [x] (PASS: `scripts/ops_win.sh` 82/82 — nový test rigify_generate: zapnout Rigify, lidský metarig (159 kostí) → Generate Rig = 706 kostí za ~7 s; pozn.: `addon_utils.enable(..., default_set=True)` jako UI, s `default_set=False` Rigify padá na KeyError v preferences.addons) Lov chyb kolo 38: Rigify (Python-těžký add-on, rigging pro hry)
- [x] (PASS: `scripts/gizmo_touch_win.sh` — prst začne tah na navigačním gizmu „ruka“ → pan (loc Δ=2,9, rot Δ=0), mimo gizmo orbit; `touch_win.sh` ALL PASS; fork commit 2e17a67e) Lov chyb kolo 39: **gizmo se nedalo tahat prstem** (1 prst ve viewportu = vždy orbit → ikony ruka/lupa vpravo nahoře a tahací šipky Move/Rotate/Scale nešly použít, jen Pencilem). Oprava: C++ publikuje, jestli je gizmo pod kurzorem (`blender_web_gizmo_hot`, wm_draw.cc); touch.js při pointerdown pošle mousemove, po 60 ms rozhodne: gizmo = levé tlačítko, jinak orbit. Move gizmo: PASS `scripts/gizmo_move_win.sh` (tah prstem za modrou šipku Z posune Cube o 1,13, pohled se neotočí; 3D gizmo se zvýrazní až při DRUHÉM mouse eventu → touch.js posílá mousemove dvakrát (0 a 35 ms) a rozhoduje po 80 ms); fork commit 898812f9.
- [x] (PASS: `scripts/idle_win.sh` — 8 s bez vstupu: počítadlo snímků WGPU_STATS 12 → 12, tj. nula překreslení → Blender v klidu nevybíjí baterii iPadu) Výkon: klidový stav
- [x] (odhad, na PC beze změny: `resize_win.sh` PASS; na iPadu neověřeno) Lov chyb kolo 40: plátno mělo `100vh`, což je na iPad Safari výška BEZ lišty → spodek Blenderu (timeline, stavový řádek) mohl být pod lištou Safari a plátno se roztahovalo oproti `innerHeight`. `demo/src/styles.css`: `100dvw/100dvh` (+ `-webkit-touch-callout:none`, `overscroll-behavior` na html/body).

- [ ] (nízká priorita) Skutečný Viewport Render na webu: asynchronní čtení offscreen bufferu + odložený zápis/vložení pixelů do ibuf v `render_opengl.cc` (podobně jako `RE_web_flush_pending_write`). Dnes jen hláška; F12 funguje.
- [x] (MITIGACE PASS: `scripts/render_features_win.sh` — 11 EEVEE případů: emise, textura obrázku, svět, průhledný film, slunce+diffuse, alpha blend, vertex color atribut, compositor přeskočen) **Compositor na webu vracel prázdný obraz** (Lov chyb kolo 66): u scény s compositing node group dával render alpha 0 / samé nuly (GPU compositor: nespustil žádný shader, poslední čtení filmu je výstup compositoru = nuly; CPU compositor dostane prázdný vstup a injekce ho přepíše syrovým filmem). Teď `do_render_compositor` na webu compositor přeskočí s varováním „Compositing is not supported in the web build“ a render zůstane bez kompozitingu. Ostatní EEVEE funkce v testu fungují.
- [ ] (nízká priorita) Skutečný compositor na webu: GPU compositor (compute shadery `compositor_*` se vůbec nespouštějí — zjistit proč; v logu není žádný WGPU_BATCH/compute pipeline) nebo CPU compositor po příchodu filmu (odložit `do_render_compositor` jako zápis souboru).
- [x] (PASS: `scripts/render_features_win.sh` volume_absorb + volume_scatter_light; fork commit viz Makefile) **Objemy (Volume Absorption/Scatter) v EEVEE se nevykreslily** (Lov chyb kolo 66): shader `eevee_volume_scatter` (varianta bez světel) selhal při překladu — `extinction_tx` undeclared v `light_eval_single` (sampler má `condition(use_volume_light)`). Oprava: použití obaleno `[[static_branch]]` podle `use_volume_light` v `eevee_volume.bsl.hh`. Odhad: stejná chyba je v upstreamu pro každý backend, který podmínku respektuje (na desktopu neověřeno).
- [ ] (GAP v testu: `render_features_win.sh` grease_pencil) **Grease Pencil objekt se v EEVEE F12 nevykreslí** (výstup samé nuly, alpha 0): GP engine čte svůj `accumulation_tx` přes `GPU_framebuffer_read_color` (`gpencil_render.cc: render_result_combined`) — synchronní čtení, v logu je druhé `WGPU_FILM read4` (fmt=40) které přepíše film EEVEE. Možná oprava: na webu přeskočit toto čtení (zachovat EEVEE film) nebo skládat GP na GPU. Priorita nízká (modelování assetů nepotřebuje).

- [~] **Texel buffery (`samplerBuffer`) WebGPU backend nepodporuje** (Lov chyb kolo 66; `webgpu_texture.cc:496 „Texture-from-buffer not implemented yet“`). Dopad (ověřeno `render_features_win.sh`): **Grease Pencil** se nevykreslí (shadery `gpencil_geometry` a `overlay_outline_prepass_gpencil` → tint ICE „Unsupported texture dimension: Buffer“, F12 i viewport), **vlasy/Curves** se nevykreslí (`hair_curves` FAIL: compute shadery doběhnou, kreslení žádné), podle kódu i Point Cloud, sculpt-curves overlay, viewer-attribute overlay, Workbench curves. Uživatelsky: GP objekt/šablona 2D Animation nic nezobrazí. Plán: nechat navrhnout architektem (kolo 66).

- [ ] (pozorování kolo 66, odhad: pravděpodobně chování i na desktopu) Bump uzel s Noise Texture BEZ explicitního Texture Coordinate (implicitní generated souřadnice) nenaklání normálu (plochý výsledek); s explicitním Texture Coordinate (Object/Generated) funguje (`render_features_win.sh` bump_noise_explicit_*, bump_height_gradient_tilts_normal PASS). Neověřeno na desktopu (CLAUDE.md 3b) — Lukáš může zkusit: kostka, Principled/Diffuse, Noise Texture (bez propojeného Vector) → Bump → Normal, render F12.

- [~] **Texel buffery — stav (kolo 66, 18. 10.)**: implementováno dle architekta (`promote_texel_buffers` v `webgpu_shader.cc`, `bind_as_texture` → `bind_texel_buffer`, SSBO vazba s kontrolou velikosti elementu = velikost 1. atributu). Výsledek: shadery `gpencil_geometry`, `overlay_outline_prepass_gpencil` se přeloží (dřív tint ICE), bind group se sestaví, GP kresby proběhnou (`WGPU_LOG_DRAW_SHADER=gpencil_geometry`, indexy v pořádku), žádná WebGPU chyba. **Pořád se nic nevykreslí** (F12 i viewport): GP strokes nejsou vidět, `hair_curves` nevytvoří žádný kreslicí pipeline (po výpočetních shaderech `draw_curves_*` se kreslení vůbec nevolá). Další kroky: (1) `WGPU_LOG_DRAW=<fb>` pro GP (depth/blend), (2) u vlasů zjistit proč EEVEE nevolá draw (batch/material), (3) dump hodnot z gp_pos_tx v shaderu. Debug pomůcky přidané: `WGPU_LOG_TEXBUF`, `WGPU_LOG_DRAW_SHADER=<substr>` (+ `WGPU_IBDRAW`), `capenv.json` v `ops_test.mjs`, `OPS_SHOT`/`RF_ONLY`/`CAPENV` v `render_features_win.sh`.

- [x] (PASS: `scripts/render_features_win.sh` hair_curves — oranžové vlasy (Curves) se vykreslí v EEVEE F12; fork commit viz Makefile) **Vlasy/Curves se na webu nevykreslovaly**: příčina 1) `GCaps.max_buffer_texture_size` nebyl nastaven (0) → `CurvesEvalCache::batch_get` ořízl batch na 0 vrcholů; 2) texel buffery (`samplerBuffer`) neexistovaly → implementováno (`promote_texel_buffers`, včetně `sampler_get/buffer_get` maker). Na iPadu ověřit: Add ▸ Curves ▸ Empty Hair + zrušit/ přidat vlasy → viditelné v Solid i Material Preview. Riziko: limit storage bufferů na stage v Safari (viz architekt: `maxStorageBuffersPerShaderStage`, Lukáš ať zjistí).

- [x] (PASS vizuálně: `out/win/gp_viewport.png` — Add ▸ Grease Pencil ▸ Monkey se ve viewportu vykreslí (tahy + oranžový obrys); fork commit viz Makefile) **Grease Pencil se ve viewportu nevykresloval**: příčiny 1) tint ICE na `samplerBuffer` (texel buffery, viz výše), 2) `dummy_depth_tx` (1×1, 1.0) se nenaplnil — upload do depth textury se přeskakoval, GP fragment shader pak zahodil všechny fragmenty (`gl_FragCoord.z > scene_depth`). Oprava: konstantní float upload přes celou depth texturu = clear pass (+ depth textury dostávají RenderAttachment usage). Na iPadu ověřit: Add ▸ Grease Pencil ▸ Stroke/Monkey, šablona 2D Animation.
- [~] (MITIGACE PASS: `render_features_win.sh` grease_pencil_scene_renders — F12 se scénou s GP objektem už není prázdný, GP tahy ale chybí) GP objekt ve F12 renderu (EEVEE/Workbench) chybí: GP engine skládá do výsledku čtením Combined passu přes CPU (`gpencil_render.cc`), což web nemá. Test: `render_features_win.sh` grease_pencil GAP.

- [x] (PASS: `scripts/bake_probe_win.sh` tiff_save_render — TIFF zápis i čtení (16bit, kodeky NONE/DEFLATE/LZW/PACKBITS); `scripts/build_oiio.sh` s `ENABLE_TIFF=ON`, `libtiff.a` přilinkována v `link_blender_release.sh`) **TIFF obrázky nešly uložit** („Could not write image“): OIIO byl stavěn s `ENABLE_TIFF=OFF`. AVIF/WebP/JPEG2000/FFMPEG video v buildu pořád nejsou.

- [x] (PASS: `scripts/overlay_sweep_win.sh` — přepíná ~150 overlayů/shading módů/režimů (Solid/Material/Rendered, matcap, cavity, shadows, xray, edit overlaye, statvis, sculpt/paint/pose) a hlásí nepřeložené shadery; nyní 0) **Workbench Solid: Matcap + Cavity ▸ Curvature (a se stíny)** se nepřeložil (`workbench_resolve_opaque_matcap_*curvature*`): `texture()` na `usampler2D` (object_id/stencil) → v WGSL `textureSample` na `u32` texturu neexistuje. Oprava: `promote_int_sampler_texture` přepíše na nejbližší `texelFetch`. Na iPadu: Solid + MatCap + Cavity zapnout křivost (Curvature) → viewport se nesmí zaseknout/zčernat.

- [x] (PASS: `scripts/node_sweep_win.sh` — všech 87 shader node typů v minimálním materiálu, EEVEE render 16×16, 0 nepřeložených shaderů) **Materiál s uzlem Wireframe se nepřeložil** (`gpu_BaryCoord` undeclared) → objekt s ním by na webu nebyl vykreslen vůbec. Oprava: konstantní barycentriky v prelude (WebGPU nemá barycentric builtin ani geometry shader) → shader se přeloží, ale uzel Wireframe nevykreslí čáry (omezení; skutečná oprava by potřebovala de-indexované trojúhelníky).

- [x] (PASS: `scripts/uv_hang_win.sh` — select_edge_ring, select_overlap, stitch ve skutečné UV oblasti doběhnou; fork commit viz Makefile) **UV operátory zamrzly**: `uv.select_overlap` — `Array<ChangedInfo>(objects.size(), {false, false})` (struct s bitfieldy a brace-init) se na wasm zavěsil (zjištěno printf bisekcí, přepsáno na `Array(n)` + přiřazení; příčina překladače/knihovny neznámá, jinde v kódu stejný vzor nenalezen); `uv.select_edge_ring` — smyčka v `uv_select_edgering` se ukončuje jen když výběr hrany odpovídá, jinak se točí donekonečna → přidán strop `bm->totface+2` kroků (pravděpodobně i upstream bug). `uv.stitch` zamrzne jen BEZ UV editoru v kontextu (Python exec), v UI/UV oblasti běží; přidán guard ve `stitch_init`. Na iPadu: UV Editing → Alt+klik na hranu (Edge Ring), Select ▸ Select Overlap, U ▸ Stitch nesmí zamrznout.
- [x] (PASS: `scripts/*_ops_sweep_win.sh` pro mesh/object/curve/armature/pose/sculpt/paint/lattice — všechny operátory se základními parametry, bez pádu a zamrznutí; chyby jsou legitimní hlášky operátorů; Fluid není v buildu) Operátorový sweep.

- [ ] (**ZJISTIT NA iPADU**, Lov chyb kolo 66) **Limit `maxStorageBuffersPerShaderStage` v Safari**: `scripts/render_features_win.sh` s `CAPENV='{"WGPU_CAP_MAX_SSBO_STAGE":"N"}'` (nový test přepínač v `creator.cc`) ukázal: EEVEE se stíny/objemy/spot potřebují ≥ 10 (při 8 selžou), **vlasy (Curves) potřebují ≥ 11–12** (compute `draw_curves_interpolate_position` má 11 storage bufferů). Při limitu 10 funguje vše kromě vlasů (ty se jen nevykreslí, nic jiného nespadne — ověřeno celou sadou `render_features_win.sh`). Pokud Safari nabízí 10, vlasy na iPadu neuvidíš; oprava by znamenala rozdělit/sloučit buffery compute shaderu. Lukáš: v Safari konzoli `(await navigator.gpu.requestAdapter()).limits.maxStorageBuffersPerShaderStage` a napsat číslo (WebKit/Metal: odhad 10).

- [ ] (**PÁD, Lov chyb kolo 66 (`scripts/space_sweep_win.sh`, repro `scripts/seq_crash_win.sh`); nízká priorita — Video Sequencer; neověřeno na desktopu**) **Video Sequencer: změna „Proxy Size / Preview Size“ (`SpaceSequenceEditor.proxy_render_size`) shodí wasm** (`Uncaught RuntimeError: memory access out of bounds` ve vlákně hlavní smyčky) — už samotné přiřazení při `sequence_editor_create()` bez strip. Podezření: update `rna_SequenceEditor_render_size_update` → `seq_build_proxy` (wm job pro proxy) nebo `seq::cache_cleanup`. Ostatní editory (20 typů + jejich přepínače) bez problémů. Lukáš může ověřit na desktopu: Video Editing → Sequencer preview → Proxy Size (View ▸ nebo Sidebar) přepnout.

- [x] (PASS: `scripts/prefs_sweep_win.sh` — 253 přepínačů Preferences, 0 Traceback; `scripts/prefs_input_win.sh` — klik na „Emulate 3 Button Mouse“ v UI nespadne; `scripts/check_rna_update_signatures.py` — statická kontrola podpisů RNA update funkcí PASS; fork commit viz Makefile) **Pád při zaškrtnutí Preferences ▸ Input ▸ Emulate 3 Button Mouse** (i klikem v UI): `rna_userdef_keyconfig_reload_update` měla 4 parametry, ale vlastnost je `PROP_CONTEXT_UPDATE` (2 parametry) → na wasm `function signature mismatch`. Statická kontrola všech `rna_*.cc` našla právě tuto jedinou nesrovnalost. Na iPadu: Preferences ▸ Input ▸ Emulate 3 Button Mouse zaškrtnout → nesmí spadnout.

- [x] (změřeno 18. 10., `scripts/idle_win.sh`: 20 s bez vstupu po načtení → 0 render passů, 0 submitů, 0 nových pipeline — Blender v klidu nic nekreslí, baterie OK) Nečinnost.
- (poznámka) web3dsurvey.com uvádí pro iOS `maxStorageBuffersPerShaderStage` hodnoty 8, 16 i 44 podle zařízení; EEVEE se stíny/objemy potřebuje ≥ 10, vlasy ≥ 11 — **stále potřeba číslo z Lukášova iPadu** (viz výše).

- [ ] (nízká priorita, Lov chyb kolo 66, `scripts/world_sweep_win.sh`; neověřeno na desktopu) **BSDF (např. Glossy/Anisotropic) zapojený přímo do World ▸ Surface shodí GPU** (`WEBGPU_LOST … A valid external Instance reference no longer exists`, shader `WOW_ShaderNodeBsdfAnisotropic_world_world`); Blender ukáže banner „GPU se odpojila“. Nesmyslné zapojení (world má mít Background/Emission), proto se ve sweepu vynechává. Navíc `ShaderNodeRaycast` ve world shaderu se nepřeloží (`drw_view_culling`) — v materiálu funguje.

- [x] (PASS: `scripts/ops_win.sh` voxel_remesh_works (2646 polygonů operátorem i modifikátorem), `scripts/render_features_win.sh` volume_object_mesh_to_volume (objem z VDB mřížky `density` je vidět), `modifier_sweep`/`gn_sweep` bez pádu; `scripts/build_openvdb.sh` OpenVDB 13.0.0 bez Boost/Blosc, `WITH_OPENVDB=ON` v `cmake/blender-wasm-cache.cmake`, ninja celého Blenderu + relink) **OpenVDB v buildu → Voxel Remesh (Ctrl+R ve sculpt módu), Remesh modifikátor (Voxel), Mesh to Volume / Volume to Mesh / Volume Displace, Geometry Nodes volume uzly fungují.** Wasm +~1 MB (blender.wasm.zst 25,7 MB). Na iPadu: Sculpt ▸ Remesh (Ctrl+R) na kouli → nová síť.

- [x] (PASS: `scripts/ops_win.sh` rigid_body_bullet_falls — aktivní kostka spadne na pasivní podlahu (z 5,0 → 1,0); quadriflow_remesh_works — opice → 268 čtyřúhelníků; 96/96) **Bullet (Rigid Body) a Quadriflow (Quad Remesh) v buildu**: `WITH_BULLET=ON`, `WITH_QUADRIFLOW=ON` (bundlované `extern/bullet2`, `extern/quadriflow`) v `cmake/blender-wasm-cache.cmake`; wasm +~0,3 MB (blender.wasm.zst 26,0 MB). Na iPadu: Physics ▸ Rigid Body (kostka na podlaze, přehrát Space); Object ▸ Quad Remesh (Remesh ▸ Quad Remesh) na kouli.

- [x] (PASS: `scripts/fluid_win.sh` — Mantaflow: Domain (GAS, 16³) + Flow, `fluid.bake_data` upeče 5 snímků do `.uni`/`.vdb`; fluid modifikátor je v ops_test jen jako GAP odstraněn) **Fluid (kouř/voda, Mantaflow) v buildu**: `WITH_MOD_FLUID=ON` (bundlovaný `extern/mantaflow`), wasm +0,56 MB (blender.wasm.zst 26,5 MB). Quick Smoke/Liquid hlásily „Built without Fluid modifier“, teď fungují. Výkon simulací na iPadu neznámý (CPU, wasm vlákna).

- [x] (PASS: `scripts/pymods_win.sh` — 26 stdlib/Blender modulů: buď fungují, nebo rychle ImportError) **`import sqlite3` zavěsil Blender** (Python konzole / skript) — nahrazeno stubem v `lib/python3.13/sqlite3.py` (`ImportError: sqlite3 is not available in the web build`), vytváří se v `link_blender_release.sh`. `_ssl`, `_ctypes`, `_lzma`, `fcntl`, `readline`, `curses` dál chybí (vyhodí ImportError rychle).

## 🐞 Nahlášeno Lukášem 24. 10. (PC i iPad, až po K2 — NE před cílem č. 1)
- [ ] **Velké modely (~40 MB .blend): občas chybí plochy (faces).** Nejdřív pravidlo 3b: stejný soubor v desktop Blenderu
  stejné verze — chybí tam taky? Pokud ne → náš bug. Hypotézy (odhad): limit velikosti bufferu/indexů při velkém meshi
  (`maxBufferSize`, 32bit indexy, rozdělení VBO), oříznutí clip start/end, nebo nedokreslené po načtení (paměť).
  Test: vygenerovat mesh ~1–2 M trojúhelníků, porovnat počet vykreslených ploch / screenshot web vs desktop.
- [ ] **Materiály s texturami ve vedlejší složce se nenačtou.** Očekávané chování (odhad): do prohlížeče se nahraje jen
  `.blend`, relativní cesty `//textures/…` v MEMFS/OPFS neexistují → růžové/prázdné textury. Oprava: při Open umožnit
  nahrát celou složku nebo .zip (`webkitdirectory` / více souborů) se zachováním relativních cest vedle .blend; na iPadu
  ověřit, co Files app dovolí. Mezitím obejití pro Lukáše: v desktop Blenderu File ▸ External Data ▸ Pack Resources
  a uložit → textury jsou uvnitř .blend.

## 🔜 Až po iPadu (Lukáš 24. 10.)
- [ ] **R: Rebase na Blender 5.3** (postup v `docs/PLAN.md` krok R) — až existuje tag `v5.3.0` (ověř `git ls-remote --tags
  https://projects.blender.org/blender/blender.git v5.3.0`). Jsme na 5.3 alpha (main 25. 6.). Po rebase projet celý
  `regress_all.sh` + parity a znovu otestovat bug list (alpha bugy mohou zmizet). Pak teprve Cycles.
- [ ] **A: Vlastní add-ony (před Cycles).** Přibalené add-ony už jdou (10/12, `addons_win.sh`). Chybí instalace
  VLASTNÍCH: Preferences ▸ Add-ons ▸ Install from Disk (.zip / .py) → soubor nahrát do OPFS do user `scripts/addons`,
  aby přežil reload. Test: malý testovací add-on + Lukášovy DropBake a Preflight. Půjdou jen čistě Python add-ony;
  ty s vlastními binárkami (.so/.pyd) ve wasm nepůjdou. Online Extensions zůstávají WONTFIX (`multiprocessing`).
  RetopoFlow až potom (těžký, nízká priorita).
- [ ] **Cycles na PC verzi** (CPU Cycles ve wasm, `WITH_CYCLES` je teď OFF; HeyPuter ho má v GL buildu — `cmake/blender-wasm-gl-cache.cmake`, commit e73ddff). Nejdřív změřit velikost buildu a rychlost renderu kostky/Monkey vs desktop. Ne pro iPad (paměť).

- [ ] (nízká priorita, 25. 10., jen skript; neověřeno na desktopu) `bpy.ops.ed.undo()` z Python timeru **bez předchozího `ed.undo_push`** (prázdný undo zásobník) se nikdy nevrátí (zamrzne i v Object módu). Skutečné Ctrl+Z hned po startu funguje (`scripts/undo_fresh_win.sh` PASS). Obejít: `undo_push` před operací (jako `ops_test.py`). Ověřit na desktopu: `bpy.ops.ed.undo()` ve Scripting konzoli hned po startu.

- [ ] (VÝKON, nález 25. 10., PC Chrome; neověřeno na desktopu) **Subdivision Surface na TROJÚHELNÍKOVÉ síti je extrémně pomalý při prvním výpočtu**: ico sphere 10 k vrcholů + Subsurf level 1 → první vyhodnocení **10,5 s** (pak 0,2 s). UV sphere (kvady) 10 k vrcholů: 0,8 s. Změřeno `SUBDIV_TIME` laps (zdroj vrácen, viz `docs/LESSONS.md`): z 10,3 s „Evaluator creation“ je **7,95 s v `StencilTableFactory::AppendLocalPointStencilTable`** (OpenSubdiv, faktorizace stencilů Gregory patchů — u trojúhelníků je každý patch nepravidelný; algoritmus je O(n²) v `WeightTable::merge`), zbytek ~2,4 s (RefineUniform 0,12, vertex stencily 0,7, patch table 0,85). Odhad: na desktopu rychlejší 5–20×, ne ověřeno. Dopad: Subsurf na importovaném/trojúhelníkovém modelu zamrzne na desítky vteřin (iPad pomalejší!). Možné mitigace: (a) `use_limit_surface=False`/`SUBSURF` `quality` nižší; (b) před subsurfem Triangles→Quads; (c) před-výpočet adaptivně `is_adaptive=false`; (d) zkusit `-sMALLOC=mimalloc` (zkoušeno: build nenaběhl — „loading Blender…“ nikdy nedoběhlo; neřešeno). Test: `scripts/heapgrow_win.sh` (název historický; `scripts/heapgrow_test.py`, `SUBDIV_TIME=1` přes `capenv.json` už nic nevypisuje po vrácení instrumentace).
  - 25. 10. `scripts/subq_win.sh` (ico 5, level 1): výchozí 2,65 s · **`use_limit_surface=False` 0,03 s** · `quality=1` 0,77 s. Obejití pro uživatele: vypnout „Use Limit Surface“ v modifikátoru (tvar se mírně liší). Výchozí hodnotu neměním (změna chování oproti desktopu).

- [ ] (nízká priorita, VÝKON 25. 10., `scripts/skin_win.sh`; neověřeno na desktopu) **Skin modifier na hustší síti je velmi pomalý**: kostka 0,01 s, UV sphere 16×8 (130 vrcholů) 1,7 s, 32×16 (482 vrcholů) **34 s** (výstup 10,9 k vrcholů); na UV sphere 60×60 neskončil do 200 s. Super-lineární; skin se běžně dává na „kostru“ s pár vrcholy, takže dopad malý. Ověřit na desktopu, zda je to normální.
- ✅ Přehled časů 30 operací/modifikátorů na 10k vrcholů (`scripts/optime_win.sh`): vše < 1 s (nejhorší edit bevel 0,62 s, subsurf lvl2 0,3 s), save/open .blend 0,03 s. Výjimky: Subsurf na trojúhelnících (viz výše), Skin.

- [ ] (nízká priorita, 25. 10., `scripts/formats_win.sh` + `scripts/dpx_win.sh`; neověřeno na desktopu) **Formáty:** ✅ obrázky PNG/JPEG/BMP/TGA/TIFF/EXR/HDR/Cineon uložit+načíst, geometrie PLY/STL/OBJ/GLB/FBX export+import PASS. ❌ **Načtení DPX souboru (`bpy.data.images.load('x.dpx')`) zamrzne** (uložení DPX funguje, 24 kB). ❌ V enum formátů obrázku chybí WEBP, JPEG2000, DDS (jsou jen AVIF, JPEG, OPEN_EXR, PNG, BMP, CINEON, DPX, IRIS, HDR, TARGA, TIFF) — desktop Blender 5.x má WebP; ❌ operátory `wm.usd_export/import`, `wm.alembic_export/import`, `wm.collada_export/import` neexistují (USD/Alembic/Collada nejsou v buildu). Pro modelování assetů stačí glTF/FBX/OBJ; USD by se hodilo (Apple AR Quick Look = USDZ!) — zvážit.

- [ ] (nápad, nízká priorita, 25. 10., `scripts/lang_win.sh`) **Jazyk UI:** v Preferences ▸ Interface ▸ Language je jen „Automatic“ (žádné překlady; `release/datafiles/locale` není v assets). Čeština (cs_CZ) by se hodila, kdyby Lukáš chtěl české menu — vyžaduje stáhnout `.po`→`.mo` (projects.blender.org/blender/blender-translations, GPL) a přibalit do assets (+ font s českou diakritikou je v DejaVu/Inter OK). Zeptat se Lukáše, zda chce.
- [ ] (nízká priorita, 25. 10., `scripts/imgload_win.sh`) Obrázky 2048² PNG/JPEG/TGA/IRIS/TIFF ukládání 0,2–1,9 s a načtení ≤ 0,34 s — OK. ❌ **AVIF je v nabídce formátů, ale uložení selže** („Could not write image: No such file or directory“) — buď AVIF z nabídky skrýt, nebo hlásit „bez podpory“.
- [x] (25. 10., PASS `scripts/memwarn_win.sh`) **Hlídač paměti:** při 2 min fuzz testu (`soak_win.sh`, 2500 náhodných operací) halda wasm narostla z 1 GB na **2,7 GB** za 80 s (halda se nikdy nezmenšuje) — na iPadu by to zabilo tab (viz `RangeError: Out of memory`). JS teď při ≥ 1500 MB ukáže oranžový pruh, při ≥ 2000 MB červený („ulož, smaž těžké objekty“; `?memwarn=N` mění práh). Čeká na iPad: zda pruh přijde dřív než pád.

- [x] (25. 10., PASS `scripts/leak_win.sh`) Růst haldy při opakovaném těžkém modelování = undo kroky (ne únik). Výchozí Undo Memory Limit 300 MB. Zbývá ověřit na iPadu a případně doladit hodnotu (`?undomem=`).

- [ ] (26. 10. 06:15, jen poznámka) `upstream` (HeyPuter) má nový commit `e73ddff` „GL backend on wink + numpy for Python add-ons" — neřeší iPad pády/WebGPU; numpy už máme. Neslučováno; Lukáš ať rozhodne po víkendu.
