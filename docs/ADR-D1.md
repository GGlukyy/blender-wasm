# ADR D1 — 64bit .blend → wasm32: interning adres místo `(addr>>3)&0xffffffff` (17. 11. 2026, architekt)

**Stav:** návrh schválen, NEIMPLEMENTOVÁNO (viz STATUS: míra výskytu v datech níže).

**Problém:** wasm32 `void*` má 4 B. Při čtení 64bit .blend se adresy bloků (`BHead::old`) a všechny ukazatele v DNA strukturách zkracují na `(p>>3)&0xffffffff`. Blender ≥ 5.1 zapisuje *stabilní* adresy (`writefile.cc:632-690, 840-880`: `hint<<4`, hint = XXH3 jména IDčka, +1 za blok) → po zkrácení kolize podle narozeninového paradoxu. Dnes (P2b) se soubor s kolizí `BHead::old` odmítne. Detektor ale nevidí ukazatele uvnitř struktur (visící ukazatel se může zkrátit na cizí blok).

**Návrh:** jedna mapa na `FileData`: každá různá nenulová 64bit hodnota → unikátní 32bit klíč `(++n)<<4` (0 zůstane 0; 16-zarovnané jako reálné ukazatele, `DefaultHash<T*>` je `ptr>>4`). Mapa je lazy, `blo_filedata_free` ji uvolní. Žádné zámky (každý FileData čte jedno vlákno). Undo memfile se netýká (wasm32 píše BHead4).

**Místa zkracování (všechna musí používat mapu):**
a. `blenloader_core/intern/blo_core_bhead.cc:43-60` `old_ptr_from_uint64_ptr` (→ `readfile.cc:616 get_bhead`)
b. `BLO_core_bhead.hh:132` `uint32_from_uint64_ptr`
c. `makesdna/intern/dna_genfile.cc:1071-1081` `cast_pointer_64_to_32` (krok vytvořen :1563, běží :1344 v `reconstruct_struct`) — pokrývá VŠECHNY pointer členy (ListBase, ID::lib, IDProperty, `void *x[N]`, …). Potřeba callback `ptr64_to_32(user, uint64)` v `DNA_ReconstructInfo`, nastavit po `readfile.cc:968`.
d. `readfile.cc:6749-6759` `convert_pointer_array_64_to_32` (`BLO_read_pointer_array`)
e. `readfile.cc:867-880` `blo_bhead_id_asset_data_address` (náš fork, `v>>3`)
f. detektor P2b: `blo_core_bhead.cc:24-41`, `readfile.cc:1286-1309, 1314` → smazat.
Jen porovnávají klíče (beze změny): `find_bhead`/`sort_bhead_old_map` (:4950-5058), `link_glob_list` (:2110), oldnewmap.

**Zamítnuto:** hash s probováním (víc kódu, klíč stejně žije jen s FileData).

**Testy:** `blend64_collide.blend` je syntetický (2 bajty změněný `old`, nic na něj neukazuje) → nové očekávání: otevře se OK a výpis (objekty/mesh/materiály/počty vrcholů) = desktop 5.3. Doplnit REÁLNÝ kolizní soubor (dvě jména IDček s totožnými nízkými ~31 bity XXH3; hledání ~65k jmen v Pythonu), uložený desktopem. Plus `obj1000.blend` z `scripts/blend_corpus_gen.py` (60 kolizí). Regrese: `regress_sim`, saveload, undo, 32bit soubory beze změny. iPad: Lukáš otevře soubor, počty v Outlineru + materiály.
**Odhad práce:** 6–8 h (kód 2–3, test 2, rebuild makesdna+blenloader 1, regrese 1).

**Zápis (wasm32 SAVE) — samostatný nález architekta, neověřeno:** `writefile.cc:879` převádí 64bit stabilní id na `void*` = zůstane jen dolních 32 bitů (`hint<<4`), `used_ids` (:848) hlídá unikátnost na 64 bitech → soubor uložený z webu může mít duplicitní adresy (prostor 2^28, 16× horší než čtení) a rozbije se i na desktopu; undo id (:893, :2388) ztratí bit 63. Návrh: kontrola unikátnosti na 32 bitech při `sizeof(void*)==4`. → test: velká scéna uložená z webu + `blend_addr_scan.py`.
