#!/bin/bash
# B3b: paměť procesů Chrome z testu po čase (renderer = JS+wasm+MEMFS, gpu = Dawn). Výstup: unix_s typ PrivateMB WorkingSetMB, po 5 s. chrome_mem_win.sh out/mem.log [max_s]
OUT=${1:-out/chrome_mem.log}; MAX=${2:-1800}; : > "$OUT"; END=$(( $(date +%s) + MAX ))
while [ "$(date +%s)" -lt "$END" ]; do
  powershell.exe -NoProfile -c "Get-CimInstance Win32_Process -Filter \"name='chrome.exe'\" | Where-Object { \$_.CommandLine -like '*playwright_chromiumdev*' -and \$_.CommandLine -like '*--type=*' } | ForEach-Object { \$t = if (\$_.CommandLine -match '--type=([a-z-]+)') { \$matches[1] } else { '?' }; '{0} {1} {2} {3}' -f \$t, \$_.ProcessId, [int](\$_.PrivatePageCount/1MB), [int](\$_.WorkingSetSize/1MB) }" 2>/dev/null | tr -d '\r' | awk -v t="$(date +%s)" 'NF==4 && $1!="utility" && $1!="crashpad-handler" {print t, $0}' >> "$OUT"
  sleep 4
done
