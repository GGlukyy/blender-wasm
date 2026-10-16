# PLAN — Blender na iPadu

Pořadí je podle poměru „užitek / cena“. Vždy dokonči jeden bod, než začneš další.

## P0 🧱 Build na PC
**Cíl:** `make all` + `make blender-web` projde ve WSL2 a demo běží v Chrome na PC
i na iPadu přes HTTPS tunel.
**Hotovo když:** Lukáš pošle screenshot z iPadu s vlastním buildem.
Zapiš čas buildu a velikost disku do STATUS.md (příště víme, co čekat).

## P1 ⚡ Přepnutí workspace bez seknutí (jen JS / data)
**Problém:** přepnutí Layout → Shading se na iPadu seká. Shadery se překládají
(GLSL → WGSL přes Tint) až za běhu, protože chybí v seed balíku `wgsl-cache.json`.
**Postup:** zjisti, jak vzniká seed (`scripts/wgsl_seed.mjs`), nasbírej shadery ze
všech workspaces (Layout, Modeling, Sculpting, UV, Texture Paint, Shading,
Animation) + Edit mode + Solid/Material/Rendered, přidej je do seedu.
**Hotovo když:** test v Chrome změří, že při prvním přepnutí se nepřekládá žádný
nový shader (počet cache-miss = 0), a Lukáš na iPadu (čistá data webu) potvrdí,
že přepnutí je plynulé.

## P2 🟠 Edit mode — není vidět výběr
**Problém:** v edit modu se nevykreslí vybrané vrcholy/hrany/plochy (overlay).
**Postup:** reprodukuj v Chrome (`scripts/editmode_test.mjs`), porovnej screenshot
s desktop Blenderem, najdi overlay shader / vertex format, který se ve WebGPU
backendu kreslí špatně. Oprava v C++ → rebuild.
**Hotovo když:** test porovná screenshot s referencí a Lukáš to potvrdí na iPadu.

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
