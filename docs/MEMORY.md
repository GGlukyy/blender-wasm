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
