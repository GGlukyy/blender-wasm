# PLAN — Blender na iPadu

Pořadí je podle poměru „užitek / cena“. Vždy dokonči jeden bod, než začneš další.

## P0 🧱 Build na PC
**Cíl:** `make all` + `make blender-web` projde ve WSL2 a demo běží v Chrome na PC
i na iPadu přes HTTPS tunel.
**Hotovo když:** Lukáš pošle screenshot z iPadu s vlastním buildem.
Zapiš čas buildu a velikost disku do STATUS.md (příště víme, co čekat).

## A 🔬 Automatický „parity“ test (web vs. desktop) — hned po P0
**Proč:** hlásit chyby po jedné je pomalé a Lukáš nezná všechny funkce. Ať je najde stroj.
**Postup:** sada skriptů, která udělá STEJNÉ akce v desktop Blenderu (headless, Python,
screenshot viewportu) i ve web buildu (Playwright, Chrome na PC) a porovná obrázky:
overlaye (3D kurzor, výběr v edit modu, wireframe, gizmo, obrys), modifikátory,
UV, materiál, uložení/otevření. Výstup: tabulka ✅/❌ + rozdílové obrázky v `out/parity/`.
Inspirace: gessa-ai „oracle“ (porovnávání s nativním buildem).
**Hypotéza k nálezům Lukáše (odhad):** 3D kurzor i výběr v edit modu „fungují, ale
nejsou vidět“ → stejná třída chyby: (a) body/tlusté čáry overlayů — WebGPU umí jen
1px body a čáry, Blender je musí rozšiřovat na quady; (b) kurzor „propadne“ objektem →
čtení depth bufferu (readback) ve WebGPU backendu nevrací správnou hloubku.
Jedna oprava může vyřešit víc chyb najednou.
**Srovnání s gessa (Lukáš, Chrome PC, 16. 10.):**
- tečky vrcholů v edit modu: NEJSOU vidět ani v gessa → bod (a) nevyřešil nikdo, je to náš úkol
  (emulace velikosti bodů: rozšířit point na quad ve vertex shaderu / instancing, viz jak to
  řeší Metal/Vulkan backend a `gpu_shader_*point*`).
- hrany/plochy v edit modu: gessa je ukazuje **jen ve Wireframe**, HeyPuter vůbec → odhad:
  overlay prohrává depth test se samotným meshem. Podezření: rozsah hloubky GL [-1,1] vs
  WebGPU [0,1] a z toho špatný depth offset overlayů. Podívej se, jak gessa převádí depth
  (donor), a porovnej s Vulkan backendem (má stejný [0,1] problém).
- 3D kurzor: v gessa funguje, ale ne úplně přesně na povrch; v HeyPuter propadne →
  stejné podezření (depth range + readback). Gessa je donor.
Pořadí: nejdřív depth (opraví 2 chyby), pak body.
**Hotovo když:** `scripts/parity_test.mjs` běží, vypíše seznam rozdílů a ten se stane
task listem pro P2+. Lukáš navíc jednou projde `docs/TEST_CHECKLIST.md`.

## P1 ⚡ Přepnutí workspace bez seknutí (jen JS / data)
**Problém:** přepnutí Layout → Shading se na iPadu seká. Shadery se překládají
(GLSL → WGSL přes Tint) až za běhu, protože chybí v seed balíku `wgsl-cache.json`.
**Postup:** zjisti, jak vzniká seed (`scripts/wgsl_seed.mjs`), nasbírej shadery ze
všech workspaces (Layout, Modeling, Sculpting, UV, Texture Paint, Shading,
Animation) + Edit mode + Solid/Material/Rendered, přidej je do seedu.
**Hotovo když:** test v Chrome změří, že při prvním přepnutí se nepřekládá žádný
nový shader (počet cache-miss = 0), a Lukáš na iPadu (čistá data webu) potvrdí,
že přepnutí je plynulé.

## R 🔄 Rebase na Blender 5.3 (po vydání 5.3, před C++ opravami P2+)
**Fakt:** náš Blender je `main` z 25. 6. 2026 = **5.3 alpha**. Port je 5 commitů navrch
(`a565b82de` wasm work, `4665739a0` webgpu backend, `32531c3c5`, `a5a9e21a2`, `6b031d3d4`),
~13 400 přidaných řádků, ~150 souborů, většinou NOVÉ soubory v `source/blender/gpu/`.
**Postup:** v `./blender/` větev `ipad-5.3` z tagu `v5.3.0` → `git cherry-pick` těch 5 commitů
+ naše opravy. Konflikty hlavně v existujících souborech GPU modulu / CMake. Pak plný build
a všechny testy + Lukáš projde na iPadu základní workflow.
**Proč až teď:** dřív = rebasovat znova; později = víc našich C++ oprav k přenášení.
**Výjimka (16. 10.):** opravy uvnitř `source/blender/gpu/webgpu/` (nové soubory portu) se
při rebase přenesou bez konfliktů → ty se smí dělat hned (P2 depth/overlaye). Opravy
mimo `webgpu/` (zbytek Blenderu) až po R.
P0/P1 (JS) jsou na verzi nezávislé.
**Hotovo když:** build z 5.3.0 projde, testy v `scripts/` zelené, Lukáš potvrdí na iPadu.

## P2 🟠 Edit mode — není vidět výběr
**Problém:** v edit modu se nevykreslí vybrané vrcholy/hrany/plochy (overlay).
**Postup:** reprodukuj v Chrome (`scripts/editmode_test.mjs`), porovnej screenshot
s desktop Blenderem, najdi overlay shader / vertex format, který se ve WebGPU
backendu kreslí špatně. Oprava v C++ → rebuild.
**Hotovo když:** test porovná screenshot s referencí a Lukáš to potvrdí na iPadu.

## P2b 💾 Otevírání .blend z desktopu (riziko poškození — ověřit brzy)
**Problém (zjištěno z gessa-ai ADR-004):** wasm32 při čtení 64-bit `.blend` (z desktop
Blenderu) zkracuje 8bajtové adresy bloků na 4 bajty (`>>3`, `BLO_core_bhead.hh`,
`dna_genfile.cc`). Některé soubory pak kolidují → pád, nebo **tichá korupce dat**.
**Postup:** ověř, jestli to má i náš fork (HeyPuter). Pokud ano: aspoň detektor kolizí
(jako gessa patch 0017), dlouhodobě pointer interning. wasm64 NE (Safari ho neumí).
**Hotovo když:** test otevře sadu .blend souborů z desktopu a buď je načte správně, nebo
nahlas odmítne — nikdy tiše nepoškodí.

## P3 🧊 High-poly model — chybí kusy, seká se
**Problém:** větší model se na iPadu vykreslí jen částečně a seká se.
**Hypotéza (odhad):** limity WebGPU v Safari (`maxBufferSize`,
`maxStorageBufferBindingSize`) — velký vertex/index buffer se nevejde.
**Postup:** nejdřív změř: vypiš `adapter.limits` na iPadu (Lukáš otevře testovací
stránku), zaloguj velikosti bufferů při nahrání modelu. Pak oprava (dělení
bufferů / správné requiredLimits) — konzultuj architekta.
**Hotovo když:** testovací model (např. 1M trojúhelníků) se na iPadu vykreslí celý.

## P4 ✋ Dotyk a Apple Pencil bez klávesnice
Dva prsty orbit, pinch zoom, Pencil = myš, plovoucí lišta (Tab, G/R/S, Ctrl+Z,
Shift/Ctrl/Alt). Hlavně JS vrstva v `demo/`. Inspirace: oficiální Blender pro Android.

## P5 📁 iPad workflow
Otevřít/uložit `.blend` do aplikace Soubory (iCloud), PWA (Přidat na plochu,
fullscreen, offline).

## Mimo plán
Cycles rychlost, nové funkce Blenderu, upgrade verzí.
