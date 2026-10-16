# SETUP na PC — pro Lukáše

Jednorázově, ~1 h práce + několik hodin první build (běží sám).
Build jede ve **WSL2** (Linux uvnitř Windows), protože skripty jsou pro Linux.

## 1. WSL2 + Ubuntu (5 min)
PowerShell **jako správce**:
```powershell
wsl --install -d Ubuntu-24.04
```
Restart PC → otevře se Ubuntu → vymysli si jméno a heslo.

Pak ve Windows vytvoř soubor `C:\Users\<ty>\.wslconfig`:
```ini
[wsl2]
memory=24GB
swap=16GB
processors=16
```
(Finální link Blenderu potřebuje hodně RAM.) PowerShell: `wsl --shutdown` a Ubuntu znovu otevři.

Místo na disku: počítej s **~100 GB** (odhad) na disku C:.

## 2. Nástroje (v Ubuntu terminálu, 10 min)
```bash
sudo apt update && sudo apt install -y build-essential git git-lfs ninja-build cmake python3 python3-pip pkg-config curl unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pnpm @anthropic-ai/claude-code
curl -L -o cf.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cf.deb && rm cf.deb
```

## 3. Repo (2 min)
Důležité: do **domovské složky WSL**, ne na `C:` (jinak je build mnohem pomalejší).
```bash
cd ~ && git clone https://github.com/GGlukyy/blender-wasm.git && cd blender-wasm
git remote add upstream https://github.com/HeyPuter/blender-wasm.git
```

## 4. Claude Code (2 min)
```bash
cd ~/blender-wasm && claude
```
Poprvé se přihlásí přes prohlížeč (tvůj Claude účet). Pak mu napiš:

> Přečti CLAUDE.md a docs/PLAN.md a udělej P0.

Build poběží hodiny — PC nech zapnutý, Claude ho hlídá. Když se Claude zeptá na
oprávnění (spustit příkaz), čti, co chce udělat, a povol.

## 5. Test na iPadu
Claude ti dá odkaz `https://….trycloudflare.com`. Otevři ho v Safari na iPadu.
Odkaz platí jen dokud běží tunel na PC.

## Tipy
- VS Code s rozšířením **WSL** ti ukáže soubory z Ubuntu: v Ubuntu napiš `code .`
- Soubory WSL najdeš i v Průzkumníku: `\\wsl$\Ubuntu-24.04\home\<ty>\blender-wasm`
- Limit Claude: build sám o sobě tokeny nežere, jen čekání. Opus jen přes architekta.
