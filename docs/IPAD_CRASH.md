# Pád iPadu (device lost: destroyed) — analýza s nadhledem (25. 10. 10:30, Claude v chatu)

Čti CELÉ před dalším pokusem. Nejdřív měř, pak opravuj. Žádné nové fuzz/regress testy mimo tento plán.

## Data, která musí každá hypotéza vysvětlit
1. Pád jen Safari/iOS; Chrome PC nikdy.
2. Pád ~33–40 s po startu, když se pracuje (G, sculpt, UV, Material Preview…); v klidu 3 min OK; Subsurf 2 OK.
3. Po K3b živých bufferů na iPadu jen 100–245 (5–14 MB), textury 60 MB → „živé objekty“ to NEJSOU.
4. Vytváření je obrovské: ~1 200–1 600 nových bufferů/s, ~30 textur/s.
5. Chyby těsně po ztrátě: `createBindGroup: Unable to make bind group` (23. 10.), `createCommandEncoder` (25. 10.).
6. Reload po pádu: `RangeError: Out of memory` (iOS nedá znovu 1 GB).

## H1 (NEJPRAVDĚPODOBNĚJŠÍ): známý bug WebKitu — destroy() neuvolní paměť, dokud ji drží bind group
- WebKit PR #76225 (Mike Wyrzykowski, Apple): „Memory of a destroyed GPUTexture is not released while a GPUBindGroup
  that referenced it exists, until the bind group is garbage collected.“ Týká se i GPUBuffer (mění `Buffer.mm`).
  Stav 14. 10. 2026: schválen 1 reviewerem, **NEMERGNUTÝ → iPadOS 26.5 ho má.** https://github.com/WebKit/WebKit/pull/76225
- Bind group nemá `destroy()`, uvolní ji jen GC. Safari GC je líný → paměť zničených bufferů se hromadí v GPU procesu
  → iOS ho zabije → `lost: destroyed`. Naše počítadla „destroyed“ vypadají dobře, ale paměť se ve skutečnosti nevrací.
- Stejný vzorec u jiného wasm projektu na iPhonu: melee-web PR #79 — `createBindGroup` první selhání po 6,7 s,
  22 514 bind groups za 2 400 snímků; oprava = perzistentní buffery + cache bind groups.
  https://github.com/isDemetrio/melee-web/pull/79
- Proč u nás: (a) `webgpu_immediate.cc:79` — KAŽDÉ immBegin/immEnd (UI, overlaye, gizma = stovky za snímek) vytvoří
  NOVÝ buffer; u polyline se binduje jako SSBO → nová bind group. (b) `uniform_arena` + klíč cache bind groups obsahuje
  `offset` (`webgpu_context.cc` build_bind_group, hash `e.offset`) → každý nový uniform slice = miss = nová bind group.
  (c) cache drží až 2048 bind groups s AddRef na buffery a pak se celá zahodí → velká dávka pro GC.
- Vysvětluje 1–6: Chrome/Dawn paměť po destroy uvolní hned (1); kumulativně podle množství práce (2); živých málo (3);
  churn (4); poslední selže právě createBindGroup (5); celková paměť procesu na hraně (6).

### Ověření H1 (levné, na PC, NEJDŘÍV)
- Do telemetrie / `drag_win.sh` přidej `bg_new/s` (vytvořené bind groups; v C++ `g_stat_bindgroups - g_stat_bg_hits`,
  nebo JS obal `GPUDevice.prototype.createBindGroup` tam, kde se počítá `buf_new`) a `view_new/s` (createView).
  Očekávání při G-tažení: stovky až tisíce/s. Pokud ≈ 0 → H1 neplatí, jdi na H2.
- Přidej do telemetrie i `submit_lag_ms`: každé 2 s `queue.onSubmittedWorkDone()` a změř, za jak dlouho se vyřeší (pro H2).

### Oprava H1 = cíl: při tažení `buf_new` ≈ 0/s a `bg_new` ≈ 0/s (architekt PŘED začátkem)
- Krok A: immediate mode → jeden perzistentní ring buffer na snímek (nebo několik, rostou zdvojením, nikdy se
  neničí za snímek); draw dostane offset (`SetVertexBuffer(..., offset, size)`); polyline SSBO přes dynamic offset.
- Krok B: uniform arena + push constants → `hasDynamicOffset=true`, offset NEpatří do klíče cache, předává se
  v `SetBindGroup(..., dynamicOffsets)`. POZOR na starý bug (komentář `webgpu_context.cc:~1830`): „všechny draw četly
  PRVNÍ offset“ = nejspíš filtrování redundantního `SetBindGroup` podle ukazatele bind group — musí se znovu vydat,
  když se změní offsety. Test: ikony v UI nejsou stejné, `parity_win.sh` 0 ❌.
- Krok C: copy-on-write VBO/UBO/SSBO (`*_buffer.cc` „fresh“) → znovupoužít, jen když GPU už nečte (ring/fence),
  nebo aspoň neměnit identitu bufferu v bind group.
- Vzor: Metal `MTLCircularBuffer`/scratch buffer, Vulkan `VKStreamingBuffer`; melee-web #79 (LRU cache, persistent).
- Po kroku A změř → pokud `bg_new` a `buf_new` výrazně klesly → hned nasadit a napsat Lukášovi test (nečekat na B, C).

## H2: chybí brzda „snímků v letu“ (backpressure)
- `present_backbuffer` + `emscripten_set_main_loop(fps=0)`: nic nečeká na dokončení GPU práce. Když iPad GPU nestíhá,
  fronta submitů roste a s ní paměť (každý command buffer drží své zdroje).
- Ověření: `submit_lag_ms` z telemetrie (H1 ověření). Roste během tažení k sekundám → H2 platí.
- Oprava: max 2 snímky v letu (počítadlo + `wgpuQueueOnSubmittedWorkDone`; když jsou 2 nevyřízené, snímek přeskočit
  = nekreslit, události dál zpracovávat). Levné, ale až po H1 měření.

## H3: ~30 nových textur/s
- Tytéž bug WebKitu (PR je hlavně o texturách) — textury jsou velké (viewport ~10 MB). Najdi, kdo je tvoří při tažení
  (offscreen/framebuffer/overlay?) a použij `webgpu_texture_pool`. Pořadí: po H1 kroku A.

## H4: celková paměť procesu (wasm 1 GB + GPU proces)
- Out of memory při reloadu = jsme blízko limitu iOS. Zmenšení INITMEM padá (`prefs_sweep`) → nechat. Až H1–H3.

## H5: konkrétní shader/pipeline spouští interní chybu Safari (viz imgui #9103, Safari 26, device lost při SetPipeline)
- Méně pravděpodobné: padá při mnoha různých operacích, ne okamžitě. Ověří se až kdyby H1–H3 nic nezměnily
  (bisect: které pipelines vznikají těsně před pádem — telemetrie posledních 20 `createRenderPipeline` labelů).

## Rozhodovací pravidlo
H1 měření → H1 krok A → iPad test → (B, C, H2, H3 podle dat). Každý krok max 1 hodina bez výsledku → architekt.
