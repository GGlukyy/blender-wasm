#!/usr/bin/env node
// Blender Web MCP relay: MCP client (stdio) <-> WebSocket <-> Blender tab in a browser.
// Tool names follow ahujasid/blender-mcp (MIT) so existing prompts work. See docs/THIRD_PARTY.md.
// Usage: blender-web-mcp [--port 8765] [--token SECRET]   (token also via BLENDER_MCP_TOKEN)
// Open Blender with  ?mcp=ws://127.0.0.1:8765&mcptoken=SECRET  — the page connects out, never listens.
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : undefined; };
const PORT = parseInt(arg("port") || process.env.BLENDER_MCP_PORT || "8765", 10);
const TOKEN = arg("token") || process.env.BLENDER_MCP_TOKEN || randomBytes(12).toString("hex");
const TIMEOUT_MS = 60000;
const log = (...a) => console.error("[blender-web-mcp]", ...a); // stdout belongs to MCP

let page = null; // the one connected Blender tab
const pending = new Map();
let nextId = 1;

const wss = new WebSocketServer({
  host: "127.0.0.1", port: PORT,
  verifyClient: ({ req }) => new URL(req.url, "http://x").searchParams.get("token") === TOKEN,
});
wss.on("connection", (ws) => {
  if (page) page.close(1000, "replaced");
  page = ws; log("Blender tab connected");
  ws.on("message", (d) => {
    let m; try { m = JSON.parse(d.toString()); } catch { return; }
    const p = pending.get(m.id); if (!p) return;
    pending.delete(m.id); clearTimeout(p.t);
    m.error ? p.rej(new Error(m.error)) : p.res(m.result);
  });
  ws.on("close", () => { if (page === ws) { page = null; log("Blender tab disconnected"); } });
});
log(`listening on ws://127.0.0.1:${PORT}  token=${TOKEN}`);
log(`open Blender with ?mcp=ws://127.0.0.1:${PORT}&mcptoken=${TOKEN}`);

const call = (cmd, params = {}) => new Promise((res, rej) => {
  if (!page) return rej(new Error("No Blender tab connected. Open the page with ?mcp=… (see relay stderr)."));
  const id = nextId++;
  const t = setTimeout(() => { pending.delete(id); rej(new Error("Blender did not answer in time")); }, TIMEOUT_MS);
  pending.set(id, { res, rej, t });
  page.send(JSON.stringify({ id, cmd, params }));
});
const text = (v) => ({ content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });
const wrap = (f) => async (a) => { try { return await f(a); } catch (e) { return { isError: true, content: [{ type: "text", text: String(e.message || e) }] }; } };

const server = new McpServer({ name: "blender-web-mcp", version: "0.1.0" });
server.tool("get_scene_info", "Objects, counts and active object of the current Blender scene.", {},
  wrap(async () => text(await call("get_scene_info"))));
server.tool("get_object_info", "Details of one object (type, transform, dimensions, materials, mesh counts).",
  { object_name: z.string() }, wrap(async ({ object_name }) => text(await call("get_object_info", { name: object_name }))));
server.tool("get_viewport_screenshot", "PNG screenshot of the Blender window.", { max_size: z.number().optional() },
  wrap(async ({ max_size }) => {
    const r = await call("get_viewport_screenshot", { max_size: max_size || 800 });
    return { content: [{ type: "image", data: r.png_base64, mimeType: "image/png" }] };
  }));
server.tool("execute_blender_code", "Run Python in Blender (bpy available). Returns captured stdout.",
  { code: z.string() }, wrap(async ({ code }) => text(await call("execute_blender_code", { code }))));
await server.connect(new StdioServerTransport());
