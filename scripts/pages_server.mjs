// O1b: statický server BEZ COOP/COEP hlaviček (jako GitHub Pages), složka pod podadresou: node pages_server.mjs <dir> <port> <prefix, např. /blender-wasm/>
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [dir, port, prefix] = [process.argv[2], +process.argv[3], process.argv[4] || "/"];
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".wasm": "application/wasm", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => { if (process.env.LOG) console.log(req.url);
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(prefix)) { res.writeHead(404); return res.end("not under prefix"); }
  p = p.slice(prefix.length); if (p === "" || p.endsWith("/")) p += "index.html";
  const f = path.join(dir, p);
  if (!f.startsWith(path.resolve(dir)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Content-Length": fs.statSync(f).size, "Cache-Control": "max-age=600" });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log("pages_server", dir, port, prefix));
