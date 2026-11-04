#!/bin/bash
# M1 test: relay + MCP klient ve WSL, Blender ve Windows Chrome (potřebuje běžící vite na :5173).
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E 'public|default|all users|desktop.ini' | head -1)}
W=/mnt/c/Users/$U/p2win; ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
cp scripts/mcp_page.mjs "$W/"
( cd "$W" && CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe' PW=playwright-core \
  cmd.exe /c "set CHROME=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe&& set PW=playwright-core&& node mcp_page.mjs 8765 testtoken123 150" > out/mcp_page.log 2>&1 & )
timeout 200 node scripts/mcp_test.mjs; rc=$?
pkill -f "mcp/relay.mjs" 2>/dev/null; exit $rc
