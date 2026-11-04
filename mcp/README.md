# blender-web-mcp (M1, experimentální)

AI klient (Claude Desktop / Claude Code…) ovládá Blender běžící v záložce prohlížeče.

1. `cd mcp && npm install && node relay.mjs` — vypíše `ws://127.0.0.1:8765` a token (nebo `--port`, `--token`).
2. Otevři Blender s `?mcp=ws://127.0.0.1:8765&mcptoken=<token>` (bez těchto parametrů je MCP vypnuté, stránka nic neposlouchá, jen se připojí ven; povoleno `ws://localhost` nebo `wss://`).
3. MCP klient: `{"command":"node","args":["/cesta/mcp/relay.mjs"]}` (stdio).

Nástroje (názvy jako ahujasid/blender-mcp): `get_scene_info`, `get_object_info`, `get_viewport_screenshot`, `execute_blender_code`.
Pozor: `execute_blender_code` spouští libovolný Python — token nikomu nedávej.
Test: `scripts/mcp_win.sh` (potřebuje vite na :5173 a Windows Chrome).
