# BACKLOG — pořadí = priorita. [ ] čeká · [~] dělám · [x] hotovo · [!] blocked

## Bugy od Lukáše (iPad, 17. 10.)
- [!] BLOCKED (nejde reprodukovat na PC; návrh opravy čeká na iPad): **Face select: z-fighting**
  Zkoušeno 17. 10.: Chrome/NVIDIA nemá z-fight (out/win/zf_before.png = zf_after.png, identické). Hypotéza
  `invariant gl_Position` ve WebGPU GLSL patchi je v `docs/patches/zfight_invariant_gl_position.patch`
  (neaplikováno, neověřeno; na iPadu otestovat po aplikaci). Depth bias v webgpu/ není vůbec (grep). Původní popis: — v režimu ploch se vybraná plocha „pere“ s nevybranou
  (overlay plochy a mesh mají stejnou hloubku). Desktop/Metal to řeší depth biasem pro face
  overlay (`overlay_edit_mesh_face`, ndc offset / polygon offset). Ověř, že WebGPU pipeline
  aplikuje stejný offset (depthBias / ndc_offset_factor). Repro: Tab, 3, klik na plochu, orbit.
- [~] **Výběr skrz objekt** — klik vybere i prvek na zadní straně (dočasné obejití bez occlusion,
  commit a760dba). Oprava bez async GPU select: CPU occlusion test — po geometrickém nearest
  pickingu ověř raycastem (BVH editmesh, `BKE_bvhutils`/`ED_view3d_win_to_segment`), že prvek
  není zakrytý; nebo použij depth snapshot (P2c) a porovnej hloubku prvku s hloubkou pixelu.
  Konzultuj architekta, guard `#ifdef __EMSCRIPTEN__`.

## Plán
- [x] **P1** (PASS: `scripts/wgsl_seed_win.sh verify` → TOTAL translations: 0, seed 179 shaderů; BLENDER_REF=f077479e. Příčina: Blender běží na pthread workeru, cache z main.js tam nebyla vidět → nikdy nefungovala; seed se načítá sync XHR. Regenerace: `scripts/wgsl_seed_win.sh seed`, `wgsl-cache.json` je v .gitignore (generovaný). Zbývá iPad: čistá data webu, přepnutí workspace) shader seed (`wgsl-cache.json`) pro všechny workspaces + edit mode + shading módy;
  test: cache-miss = 0 při prvním přepnutí.
- [ ] **Výkonový panel**: FPS, ms/snímek, paměť wasm, počet draw callů; zapnutí `?perf=1`.
- [ ] Vrcholy velikostí jako na desktopu (teď ~4–5 px vs ~6 px).
- [ ] **P2b** riziko korupce 64-bit .blend (gessa ADR-004): ověř + aspoň detektor kolizí.
- [ ] **P3** high-poly: model 500k–1M trojúhelníků, ověř limity bufferů a čas snímku.
- [ ] `_multiprocessing` chybí → add-on Extensions (bl_pkg) se neregistruje (nízká priorita).

## Výkon (až nebude co opravovat)
- [ ] Změř orbit na Monkey + Subdivision 3: ms/snímek, kde se čeká (CPU vs GPU vs upload).
- [ ] Zbytečné re-uploady bufferů každý snímek? Pipeline cache hit rate?
- [ ] Čas startu: kde se čeká (stahování, rozbalení, Python init, shadery) → zrychli největší.
