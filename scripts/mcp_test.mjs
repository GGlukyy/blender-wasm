// M1: MCP klient (stdio) -> relay -> stránka s Blenderem. Spouští se z WSL (mcp_win.sh), stránku otevírá Windows Chrome.
import { Client } from "/home/lukil/blender-wasm/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "/home/lukil/blender-wasm/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { writeFileSync } from "node:fs";
const PORT = "8765", TOKEN = "testtoken123";
const t = new StdioClientTransport({ command: "node", args: ["mcp/relay.mjs", "--port", PORT, "--token", TOKEN], stderr: "inherit" });
const c = new Client({ name: "mcp_test", version: "1" });
await c.connect(t);
const fail = (m) => { console.log("FAIL " + m); process.exit(1); };
const txt = (r) => r.content.find((x) => x.type === "text")?.text;
// čekání na spojení stránky (volá se, dokud nepřestane hlásit No Blender tab)
let info; for (let i = 0; i < 120; i++) {
  info = await c.callTool({ name: "get_scene_info", arguments: {} });
  if (!info.isError) break; await new Promise((r) => setTimeout(r, 2000));
}
if (info.isError) fail("get_scene_info: " + txt(info));
const scene = JSON.parse(txt(info)); const names = scene.objects.map((o) => o.name);
console.log("SCENE", names.join(","));
if (!["Cube", "Camera", "Light"].every((n) => names.includes(n))) fail("výchozí scéna nemá Cube/Camera/Light");
const ex = await c.callTool({ name: "execute_blender_code", arguments: { code: "bpy.ops.mesh.primitive_uv_sphere_add(location=(3,0,0))\nbpy.context.object.name='McpSphere'\nprint('added', bpy.context.object.name)" } });
if (ex.isError || !/added McpSphere/.test(txt(ex))) fail("execute_blender_code: " + txt(ex));
const oi = await c.callTool({ name: "get_object_info", arguments: { object_name: "McpSphere" } });
const o = JSON.parse(txt(oi)); if (o.location[0] !== 3 || !o.mesh.vertices) fail("get_object_info " + txt(oi));
const bad = await c.callTool({ name: "execute_blender_code", arguments: { code: "raise ValueError('boom')" } });
if (!bad.isError || !/boom/.test(txt(bad))) fail("chyba v kódu se nevrátila");
const shot = await c.callTool({ name: "get_viewport_screenshot", arguments: { max_size: 600 } });
const img = shot.content.find((x) => x.type === "image"); if (!img) fail("screenshot: " + txt(shot));
writeFileSync("out/mcp_shot.png", Buffer.from(img.data, "base64"));
console.log("PASS mcp: scene+exec+object_info+error+screenshot " + img.data.length + " B base64");
await c.close(); process.exit(0);
