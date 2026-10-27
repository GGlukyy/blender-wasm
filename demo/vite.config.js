import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

/* M0 telemetry: the page (demo/src/telemetry.js) POSTs JSON samples to /__telemetry;
 * each line is appended to out/ipad/tel_<date>.jsonl so iPad runs can be read on the PC. */
const telemetryPlugin = () => ({
  name: "blender-telemetry",
  configureServer(server) {
    const dir = path.resolve(__dirname, "../out/ipad");
    server.middlewares.use("/__telemetry", (req, res) => {
      if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        try {
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, "tel_" + new Date().toISOString().slice(0, 10) + ".jsonl");
          const body = Buffer.concat(chunks).toString("utf8").trim();
          const ua = String(req.headers["user-agent"] || "").slice(0, 120);
          for (const line of body.split("\n")) {
            if (!line) continue;
            let o; try { o = JSON.parse(line); } catch { o = { raw: line.slice(0, 500) }; }
            o.srv_t = Date.now(); o.ua = ua;
            fs.appendFileSync(file, JSON.stringify(o) + "\n");
          }
        } catch (e) { console.error("telemetry:", e); }
        res.statusCode = 204; res.end();
      });
    });
  },
});

/* Blender-wasm needs SharedArrayBuffer (pthreads): cross-origin isolation on
 * both the dev server and the preview server. */
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

/* R0: RELEASE=1 (scripts/package_itch.sh) builds the itch.io page: no Puter analytics/branding (replaced by an
 * "unofficial port" credit with source links, GPL), telemetry code disabled (__RELEASE__). */
const RELEASE = !!process.env.RELEASE;
const credit = '<div class="credit-badge"><span>Neoficiální port, založeno na</span> ' +
  '<a href="https://github.com/heyputer/blender-wasm" target="_blank" rel="noreferrer">HeyPuter/blender-wasm</a>' +
  '<span class="credit-sep" aria-hidden="true">|</span><span>zdrojáky (GPL):</span> ' +
  '<a href="https://github.com/GGlukyy/blender-wasm" target="_blank" rel="noreferrer">blender-wasm</a>' +
  '<span class="credit-sep" aria-hidden="true">|</span>' +
  '<a href="https://github.com/GGlukyy/blender" target="_blank" rel="noreferrer">blender</a></div>';
const releasePlugin = () => ({
  name: "blender-release-html",
  transformIndexHtml(html) {
    if (!RELEASE) return html;
    let out = html
      .replace(/<script async src="https:\/\/plausible\.io[^>]*><\/script>\s*<script>[\s\S]*?<\/script>/, "")
      .replace(/<meta property="og:site_name"[^>]*>/, '<meta property="og:site_name" content="Blender in the Browser (unofficial)" />')
      .replace(/<meta (?:property="og:image"|name="twitter:image")[^>]*>\s*/g, "")
      .replace(/<meta (?:property="og:image:(?:width|height|alt)"|name="twitter:image:alt")[^>]*>\s*/g, "")
      .replace(/<div class="nav-left">[\s\S]*?<\/div>\s*<div class="nav-links">/, '<div class="nav-left"></div>\n        <div class="nav-links">')
      .replace(/https:\/\/github\.com\/heyputer\/blender-wasm" target="_blank" rel="noreferrer">\s*<svg/, 'https://github.com/GGlukyy/blender-wasm" target="_blank" rel="noreferrer">\n            <svg')
      .replace(/<div class="credit-badge">[\s\S]*?<\/div>/, credit);
    return out;
  },
});

export default defineConfig({
  define: { __RELEASE__: JSON.stringify(RELEASE) },
  plugins: [telemetryPlugin(), releasePlugin()],
  /* Emit relative asset URLs (./assets/...) so the built site works when served
   * from any subpath, not just the domain root. The runtime fetches
   * (blender.wasm.zst, assets.tar.zst, manifest.json, blender.js) are already
   * document-relative in main.js, so they follow the page's location too. */
  base: "./",
  server: {
    headers: isolationHeaders,
    allowedHosts: true
  },
  preview: { headers: isolationHeaders },
  build: { target: "esnext" },
});
