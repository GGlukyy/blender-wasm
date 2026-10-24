# Paměť — měření (sprint „iPad vydrží“)
Nástroj: `scripts/mem_win.sh [idle_s]` (Windows Chrome, limity jako Safari: buffer 256 MiB, SSBO 128 MiB, +telemetrie `?tel=1`).
Počítadla jsou v JS (`creator.cc`: obaluje `device.createBuffer/createTexture` a `destroy()`), na PC i iPadu stejná.

## M1 baseline (23. 10., PC Chrome/NVIDIA)
| krok | wasm heap MB | živé buffery (ks) | buffery MB | vytvořeno celkem | `destroy()` zavoláno | uvolněno až GC |
|---|---|---|---|---|---|---|
| boot + 60 s klid (jen šum myší) | 1024 | 609 | 5 | 609 | 0 | 0 |
| UV Editing + edit mode | 1024 | 4708 | 11 | 5694 | 0 | 986 |
| Material Preview | 1024 | 6165 | 17 | 7151 | 0 | 986 |
| Sculpt + Subsurf 2 | 1024 | 8569 | 22 | 9555 | 0 | 986 |
| Monkey Subsurf 3 | 1024 | 9834 | 80 | 10820 | 0 | 986 |

**Zjištění:** `destroy()` se nevolá NIKDY (0 z 10 820 bufferů). Buffery se uvolňují jen garbage collectorem (986 z 10 820). Živých GPU bufferů roste na ~10 000 během 2 minut → hypotéza A (M2) potvrzena. Textury (odhad v JS) 65 → 191 MB, také bez `destroy()`.
Pozn.: wasm heap je 1024 MB hned od startu (INITIAL_MEMORY), neroste — viz M4. FPS ve sloupci neuvedeno (renderuje se jen na požádání).

## M2 po odloženém destroy() (23. 10., buffery kromě mesh VBO)
Mem test po opravě: živých bufferů 6975 místo 9834 (zničeno 1650 z 9515; zbytek jsou přechodné VBO overlayů/UI, které se zatím jen uvolňují — viz BACKLOG M2). Bez VBO výjimky (jen debug): 77–120 živých, 9536 zničeno.

## M3 DPR (refutováno)
`DPR=2 scripts/mem_win.sh`: GPU textury 49–79 MB stejně jako při DPR 1. Framebuffer se kreslí v CSS pixelech (iPad Air ≈ 1180×820), takže DPR 2 paměť neznásobuje. Hypotéza B neplatí.

## M2 hotovo (23. 10. večer, po opravě více kontextů)
Mem test (limity Safari): živých bufferů 91–2973 (špička při UV Editing, než doběhne flush), na konci 91; vytvořeno 10 623, `destroy()` 10 532, GC 0. Předtím 9 834 živých a 0 zničených.
**Otevřené:** `performance.measureUserAgentSpecificMemory()` (Chrome) ukazuje celý agent ~3,4 GB (nezávisle na `PTHREAD_POOL_SIZE` 8 vs 32, `POOL=8 link_blender_release.sh`) — z čeho je, ještě nevím (wasm heap je 1 GB od startu); tohle je hlavní podezřelý pro iPad (M4).

## High-poly s limity Safari + destroy (23. 10. večer, `highpoly_win.sh N ipad`)
1,3 M ploch: 142 ms/snímek (bez destroy 256 ms, `HP_ND=all`); 5,2 M ploch: 521 ms, bez pádu a bez chyb. Dřívější měření z 18. 10. (38 ms) nešlo zopakovat — jiná zátěž PC, neřešit.

## K1 — teploměr „rychlé tažení plochy“ (24. 10. 22:55, PC Chrome, `scripts/drag_win.sh 10`)
Kostka → Edit → plocha → G → 10 s pohybů myši (Playwright; jen ~16 pohybů × 8 kroků, protože `mouse.move` je při zatíženém Blenderu pomalé). Screenshot `out/win/drag_end.png`: plocha se opravdu táhne (Dx/Dy/Dz v hlavičce).
- **buf_new ≈ 1220/s** (vytvořeno 93 098 bufferů za 10 s), destroyed ≈ 1220/s, **živých max 172** (destroy drží krok), **tex_new ≈ 23/s**, 9 FPS, 13 submitů / 45 passů na vzorek.
- Pozor (odhad): běh obsahoval první kompilaci shaderů (pruh „Kompiluji shadery“, cold cache), takže FPS je nízké; a při předchozích dvou během (bez skutečného tažení, FPS ~1) bylo buf_new jen 30–50/s. Číslo 1220/s je tedy horní odhad za „plné překreslování“.
- Závěr K1: při tažení vzniká ~1000+ bufferů a ~20 textur za sekundu → splňuje hypotézu z BACKLOGu (alokace/s). Strop překreslení (K2) by to měl úměrně snížit; K3 (pool) je až dál.
