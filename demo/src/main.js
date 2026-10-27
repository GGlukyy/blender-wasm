/* Blender-wasm release demo.
 *
 * Assets (Blender 5.3 scripts/datafiles + the CPython stdlib) ship as
 * assets.tar.zst. Zero-copy load (files + pattern copied from gecko-wasm's
 * chrome-fs.ts + provider_backend.h + provider-fs.js): download + zstd-
 * decompress into ONE buffer, index the tar into path -> Uint8Array VIEWS
 * (no copies), and expose it as an FsProvider (stat/readdir/readFile). The
 * WasmFS ProviderBackend (demo/provider_backend.cpp) mounts it at /assets and
 * reads it provider-first, materializing each file on open — no per-file
 * extraction, no OPFS write storm. Only the persistent HOME touches OPFS
 * (/opfs/home). The wasm itself ships as blender.wasm.zst, decompressed each
 * visit and fed to emscripten via Module.instantiateWasm.
 */
import { ZSTDDecoder } from "zstddec";
import { installTouch } from "./touch.js";
import { installTelemetry, telEnabled, telLog, telEvent, telAdapterLimits } from "./telemetry.js";
installTelemetry();

/* ---- Splash UI: progress bar + startup console (ported from gecko-wasm's
 * demo/chrome/src/main.ts). ---- */
const splashEl = document.getElementById("splash");
const splashShell = document.getElementById("splash-shell");
const stageCard = document.getElementById("stage-card");
const stageEl = document.querySelector(".stage");
const statusEl = document.getElementById("splash-status");
const phaseEl = document.getElementById("progress-phase");
const percentEl = document.getElementById("progress-percent");
const fillEl = document.getElementById("progress-fill");
const progressbar = document.querySelector(".progress-track");
const consoleOutput = document.getElementById("console-output");
const startBtn = document.getElementById("start-btn");
const gpuWarning = document.getElementById("gpu-warning");
const gpuWarningText = document.getElementById("gpu-warning-text");
const gpuAckRow = document.getElementById("gpu-ack-row");
const gpuAck = document.getElementById("gpu-ack");

function setUiPhase(next) {
  splashShell.dataset.phase = next;
  stageCard.dataset.phase = next;
  stageEl.dataset.phase = next;
}

/* Mirror console.{log,warn,error} into the on-page startup log. */
const nativeConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
const MAX_CONSOLE_LINES = 400;
const stringifyArg = (a) => {
  if (a instanceof Error) return a.stack || a.message;
  if (typeof a === "string") return a;
  try { return JSON.stringify(a); } catch { return String(a); }
};
function appendConsoleLine(level, args) {
  const line = document.createElement("div");
  line.className = `console-line ${level}`;
  const prefix = document.createElement("span");
  prefix.className = "console-prefix";
  prefix.textContent = `[${level}] `;
  line.append(prefix, args.map(stringifyArg).join(" "));
  consoleOutput.appendChild(line);
  while (consoleOutput.childElementCount > MAX_CONSOLE_LINES) {
    consoleOutput.firstElementChild?.remove();
  }
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}
console.log = (...a) => { appendConsoleLine("log", a); nativeConsole.log(...a); };
console.warn = (...a) => { appendConsoleLine("warn", a); nativeConsole.warn(...a); };
console.error = (...a) => { appendConsoleLine("error", a); nativeConsole.error(...a); };
const log = (m) => console.log(m);

function formatBytes(n) {
  const u = ["B", "KB", "MB", "GB"];
  let v = n, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v >= 10 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}
function setProgress(p) {
  const pct = p.percent == null ? undefined : Math.max(0, Math.min(1, p.percent));
  statusEl.textContent = (p.loaded && p.total)
    ? `${p.message} · ${formatBytes(p.loaded)} / ${formatBytes(p.total)}`
    : p.message;
  phaseEl.textContent = p.phase[0].toUpperCase() + p.phase.slice(1);
  if (pct == null) { progressbar.removeAttribute("aria-valuenow"); percentEl.textContent = ""; return; }
  const r = Math.round(pct * 100);
  fillEl.style.width = `${r}%`;
  progressbar.setAttribute("aria-valuenow", String(r));
  percentEl.textContent = `${r}%`;
}
/* Legacy status() shim used elsewhere in this file. */
const status = (t) => { statusEl.textContent = t; };

/* ---- Combined download manager: the asset tar and the engine wasm (both
 * zstd) download CONCURRENTLY and share one progress bar (summed bytes), then
 * both are decompressed. ---- */
const dl = {
  assets: { loaded: 0, total: 0 },
  wasm: { loaded: 0, total: 0 },
};
function renderDownloads() {
  const loaded = dl.assets.loaded + dl.wasm.loaded;
  const total = (dl.assets.total && dl.wasm.total) ? dl.assets.total + dl.wasm.total : undefined;
  setProgress({
    phase: "downloading", loaded, total,
    percent: total ? loaded / total : undefined,
    message: "Downloading Blender",
  });
}
/* Stream `url` with progress into `dl[key]`, return the compressed bytes. */
async function fetchZst(url, key) {
  /* iOS suspends/kills fetches when the tab goes to the background ("TypeError: Load failed", seen in iPad telemetry
   * 23. 10.): wait until visible again and retry the whole download (up to 3×). */
  for (let attempt = 1; ; attempt++) {
    try { return await fetchZstOnce(url, key); }
    catch (e) {
      if (attempt >= 4) throw e;
      console.warn("fetch retry", attempt, url, String(e));
      dl[key].loaded = 0; dl[key].total = 0;
      while (document.hidden) await new Promise((res) => setTimeout(res, 500));
      await new Promise((res) => setTimeout(res, 800 * attempt));
    }
  }
}
async function fetchZstOnce(url, key) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`${url}: HTTP ${r.status}`);
  dl[key].total = Number(r.headers.get("Content-Length")) || 0;
  const reader = r.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    dl[key].loaded += value.byteLength;
    renderDownloads();
  }
  if (!dl[key].total) dl[key].total = dl[key].loaded;
  renderDownloads();
  const out = new Uint8Array(dl[key].loaded);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

const decoder = new ZSTDDecoder();
const manifest = await (await fetch("manifest.json")).json();

/* ---- In-memory tar FsProvider (pattern + code from gecko-wasm chrome-fs.ts).
 * The tar is indexed as path -> Uint8Array VIEWS into the one decompressed
 * buffer (zero-copy) plus a directory tree; makeProvider() exposes it as the
 * {stat, readdir, readFile} FsProvider that the WasmFS ProviderBackend
 * (demo/provider_backend.cpp + provider-fs.js) reads, provider-first, for
 * /assets. Paths are mount-relative. ---- */
const textDecoder = new TextDecoder();
function parseTarString(bytes, start, length) {
  let end = start;
  const max = start + length;
  while (end < max && bytes[end] !== 0) end++;
  return textDecoder.decode(bytes.subarray(start, end));
}
function parseTarSize(bytes, start) {
  const first = bytes[start];
  if (first & 0x80) {
    let size = first & 0x7f;
    for (let i = start + 1; i < start + 12; i++) size = (size * 256) + bytes[i];
    return size;
  }
  const raw = parseTarString(bytes, start, 12).trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}
function parsePax(data) {
  const text = textDecoder.decode(data);
  const out = {};
  let i = 0;
  while (i < text.length) {
    const space = text.indexOf(" ", i);
    if (space < 0) break;
    const length = Number.parseInt(text.slice(i, space), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = text.slice(space + 1, i + length - 1);
    const eq = record.indexOf("=");
    if (eq >= 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    i += length;
  }
  return out;
}
function tarEntryName(bytes, offset) {
  const name = parseTarString(bytes, offset, 100);
  const prefix = parseTarString(bytes, offset + 345, 155);
  return prefix ? `${prefix}/${name}` : name;
}
function isEmptyBlock(bytes, offset) {
  for (let i = offset; i < offset + 512; i++) if (bytes[i] !== 0) return false;
  return true;
}
// Register a file/dir path into the directory tree, creating implicit parents.
function addToTree(dirs, parts, isDir) {
  let dir = "";
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    let children = dirs.get(dir);
    if (!children) { children = new Set(); dirs.set(dir, children); }
    children.add(parts[i]);
    if (isLast && !isDir) break;
    dir = dir ? `${dir}/${parts[i]}` : parts[i];
    if (isLast && !dirs.has(dir)) dirs.set(dir, new Set());
  }
}
function indexTar(bytes) {
  const files = new Map();          // path -> Uint8Array view (zero-copy)
  const dirs = new Map([["", new Set()]]);
  let offset = 0;
  let pax, longName;
  while (offset + 512 <= bytes.length && !isEmptyBlock(bytes, offset)) {
    const type = String.fromCharCode(bytes[offset + 156] || 0);
    const size = parseTarSize(bytes, offset + 124);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > bytes.length) throw new Error("asset-fs: truncated tar");
    const data = bytes.subarray(dataStart, dataEnd);
    const name = (pax?.path ?? longName ?? tarEntryName(bytes, offset)).replace(/^\.\//, "");
    pax = undefined; longName = undefined;
    const parts = name.split("/").filter(Boolean);
    if (name.startsWith("/") || parts.includes("..")) throw new Error(`asset-fs: unsafe path ${name}`);
    if (type === "x") {
      pax = parsePax(data);
    } else if (type === "L") {
      longName = parseTarString(data, 0, data.length);
    } else if (parts.length && (type === "0" || type === "\0" || type === "")) {
      files.set(parts.join("/"), data);
      addToTree(dirs, parts, false);
    } else if (parts.length && type === "5") {
      addToTree(dirs, parts, true);
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return { files, dirs };
}
const normalizeAssetPath = (p) => p.split("/").filter(Boolean).join("/");
function makeAssetProvider(index) {
  return {
    stat(path) {
      const p = normalizeAssetPath(path);
      const file = index.files.get(p);
      if (file) return { size: file.byteLength, isDir: false };
      if (index.dirs.has(p)) return { size: 0, isDir: true };
      return null;
    },
    readdir(path) {
      const children = index.dirs.get(normalizeAssetPath(path));
      if (!children) throw new Error(`asset-fs: no such directory ${path}`);
      return [...children];
    },
    readFile(path) {
      const file = index.files.get(normalizeAssetPath(path));
      if (!file) throw new Error(`asset-fs: no such file ${path}`);
      return file; // zero-copy view into the one decompressed buffer
    },
  };
}

/* ---- GPU capability gate ------------------------------------------------
 * Probe the WebGPU adapter EARLY (concurrent with the download; no user
 * activation needed) so the user learns about a missing/software renderer
 * before waiting for ~50 MB. If WebGPU is absent the Launch button stays
 * disabled; if it falls back to a software renderer (SwiftShader / llvmpipe /
 * Dawn fallback) the button is greyed out until the user ticks an
 * acknowledgement checkbox. A real GPU shows nothing and launches normally. */
let assetsReady = false;
let gpuStatus = null; /* { ok, software, fatal, desc, message } once resolved */

function refreshStartGate() {
  /* No hard blocker resolves the button purely on asset readiness; a fatal GPU
   * problem keeps it disabled; a software fallback needs the ack checkbox. */
  if (gpuStatus && gpuStatus.fatal) {
    startBtn.disabled = true;
    return;
  }
  const needAck = !!(gpuStatus && gpuStatus.software);
  const acked = needAck ? gpuAck.checked : true;
  startBtn.disabled = !assetsReady || !acked;
}

function applyGpuStatus(s) {
  gpuStatus = s;
  if (s.ok) {
    gpuWarning.hidden = true;
    gpuAckRow.hidden = true;
  } else {
    gpuWarning.hidden = false;
    gpuWarningText.innerHTML = s.message;
    /* Only a software fallback is launch-able (via the ack); a total absence of
     * WebGPU cannot start Blender, so no override checkbox is offered. */
    gpuAckRow.hidden = !s.software;
  }
  refreshStartGate();
}

async function probeGpu() {
  if (!navigator.gpu) {
    return { ok: false, software: false, fatal: true, desc: "",
      message: "This browser has no <b>WebGPU</b> support, so Blender cannot start. " +
        "Use a recent Chromium-based browser (Chrome/Edge 113+) with hardware acceleration enabled." };
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) telAdapterLimits(adapter);
    if (!adapter) {
      return { ok: false, software: false, fatal: true, desc: "",
        message: "No <b>WebGPU adapter</b> is available, so Blender cannot start. " +
          "Enable hardware acceleration / GPU access in your browser and reload." };
    }
    const info = (adapter.info) || {};
    const desc = [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(" | ");
    const software = adapter.isFallbackAdapter ||
      /swiftshader|software|llvmpipe|lavapipe|basic|warp|microsoft basic/i.test(desc);
    if (desc) log("WEBGPU_ADAPTER " + desc);
    if (software) {
      return { ok: false, software: true, fatal: false, desc,
        message: "WebGPU is running on a <b>software renderer</b>" +
          (desc ? " (<code>" + desc + "</code>)" : "") +
          " — Blender will be <b>extremely slow</b>. For real performance, enable hardware " +
          "GPU acceleration (Chrome: <code>--enable-unsafe-webgpu --enable-features=Vulkan " +
          "--ignore-gpu-blocklist</code>)." };
    }
    return { ok: true, software: false, fatal: false, desc, message: "" };
  } catch (e) {
    return { ok: false, software: false, fatal: true, desc: "",
      message: "WebGPU probe failed (" + (e && e.message || e) + "). Blender cannot start." };
  }
}

/* Kick the probe off immediately and reflect it in the UI as soon as it lands. */
gpuAck.addEventListener("change", refreshStartGate);
probeGpu().then(applyGpuStatus).catch(() => {});

/* ---- Download the asset tar + engine wasm CONCURRENTLY (one combined
 * progress bar), then zstd-decompress both. `assetProvider` (the zero-copy tar
 * FsProvider) and `wasmBytes` are consumed when the user clicks Launch. ---- */
setUiPhase("loading");
await decoder.init();
let [assetsTar, wasmBytes] = await Promise.all([
  fetchZst("assets.tar.zst", "assets").then((z) => {
    setProgress({ phase: "decompressing", percent: 1, message: "Decompressing assets" });
    return decoder.decode(z, manifest["assets.tar.zst"]);
  }),
  fetchZst("blender.wasm.zst", "wasm").then((z) => {
    setProgress({ phase: "decompressing", percent: 1, message: "Decompressing Blender" });
    return decoder.decode(z, manifest["blender.wasm.zst"]);
  }),
]);
const assetProvider = makeAssetProvider(indexTar(assetsTar));
log(`assets indexed zero-copy: ${(assetsTar.length / 1048576) | 0} MB · wasm ${(wasmBytes.length / 1048576) | 0} MB`);
setProgress({ phase: "ready", percent: 1, message: "Ready to launch" });
setUiPhase("ready");
assetsReady = true;
refreshStartGate();

/* ---- WGSL translation cache (IndexedDB + shipped seed) ---- */
const idbOpen = () => new Promise((res, rej) => {
  const rq = indexedDB.open("blender-fs", 2);
  rq.onupgradeneeded = () => {
    const db = rq.result;
    if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "path" });
    if (!db.objectStoreNames.contains("wgsl")) db.createObjectStore("wgsl", { keyPath: "key" });
  };
  rq.onsuccess = () => res(rq.result);
  rq.onerror = () => rej(rq.error);
});

/* ---- boot ---- */
/* ---- ?perf=1: performance overlay (FPS, ms/frame, draw stats, wasm heap). Samples come from the
 * render pthread via BroadcastChannel (webgpu_context.cc wgpu_perf_post). ---- */
if (new URLSearchParams(location.search).get("perf") === "1") {
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;top:4px;right:4px;z-index:99999;background:rgba(0,0,0,.7);" +
    "color:#9f9;font:12px/1.35 monospace;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:pre";
  box.textContent = "perf: čekám na snímky…";
  if (document.body) document.body.appendChild(box);
  else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(box));
  let last = 0;
  new BroadcastChannel("blender-perf").onmessage = (e) => {
    const d = e.data; last = performance.now();
    window.__PERF__ = d;
    box.textContent =
      `${(1000 / d.dt_avg_ms).toFixed(0)} FPS  ${d.dt_avg_ms.toFixed(1)} ms (max ${d.dt_max_ms.toFixed(0)})\n` +
      `submits ${d.submits}  passes ${d.passes}  bindgroups ${d.bindgroups}\n` +
      `WebGPU draw/submit ${d.api_ms.toFixed(1)} ms   immediate bufs ${d.imm_bufs} (${d.imm_kb} KB)\n` +
      `textures ${d.tex} / ${d.tex_mb} MB   wasm heap ${d.heap_mb.toFixed(0)} MB`;
  };
  setInterval(() => { if (last && performance.now() - last > 2500) box.style.opacity = ".4"; else box.style.opacity = "1"; }, 1000);
}

/* "Kompiluji shadery" overlay: the render pthread blocks for seconds while the browser compiles big
 * WebGPU pipelines (first Material Preview / Rendered switch). It posts to "blender-compile" before
 * each compile (webgpu_context.cc wgpu_note_compile); the main thread is free, so show a message
 * when compiles keep coming for > 700 ms, hide after 2.5 s of silence. */
{
  const note = document.createElement("div");
  note.style.cssText = "position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:99998;" +
    "background:rgba(20,20,20,.88);color:#fff;font:14px/1.3 system-ui,sans-serif;padding:8px 16px;" +
    "border-radius:8px;pointer-events:none;display:none";
  note.textContent = "⏳ Kompiluji shadery… (jen poprvé, může to trvat několik sekund)";
  const attach = () => document.body.appendChild(note);
  if (document.body) attach(); else document.addEventListener("DOMContentLoaded", attach);
  let first = 0, hideT = 0;
  new BroadcastChannel("blender-compile").onmessage = () => {
    const now = performance.now();
    if (!first) first = now;
    if (now - first > 700) note.style.display = "block";
    clearTimeout(hideT);
    hideT = setTimeout(() => { note.style.display = "none"; first = 0; window.__COMPILE_SHOWN__ = false; }, 2500);
    if (note.style.display === "block") window.__COMPILE_SHOWN__ = true;
  };
}

window.__BGUI__ = { booted: false, device: false, window: false };
const showGpuLost = (reason, msg) => {
  telEvent("lost", { reason, msg: msg || "" });
  if (document.getElementById("gpu-lost")) return;
  window.__GPU_LOST__ = reason;
  const b = document.createElement("div");
  b.id = "gpu-lost";
  b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;padding:14px 18px;background:#b3261e;color:#fff;font:16px system-ui;text-align:center";
  b.innerHTML = "GPU se odpojila (" + reason + "). Obnov stránku — rozdělaná práce je v <code>/opfs/home/_autosave.blend</code> (📁). <button style='margin-left:12px;font-size:16px' onclick='location.reload()'>Obnovit</button>";
  document.body.appendChild(b);
};
/* File ▸ Quit / Ctrl+Q: Blender prints "Blender quit" and the runtime halts, leaving the LAST FRAME frozen
 * on the canvas with no hint. Say so and offer a reload. */
const showQuit = () => {
  if (document.getElementById("blender-quit")) return;
  window.__BLENDER_QUIT__ = true;
  const b = document.createElement("div");
  b.id = "blender-quit";
  b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;padding:14px 18px;background:#444;color:#fff;font:16px system-ui;text-align:center";
  b.innerHTML = "Blender skončil (File ▸ Quit / Ctrl+Q). Uložené soubory v 📁 zůstaly; rozdělaná práce je v <code>/opfs/home/_autosave.blend</code>. <button style='margin-left:12px;font-size:16px' onclick='location.reload()'>Spustit znovu</button>";
  document.body.appendChild(b);
};
/* Memory guard: the wasm heap only grows (never shrinks). Safari on iPad kills the tab somewhere around 1.5–2 GB,
 * and heavy ops (Subsurf 5+, big Remesh/Array) can jump there in seconds → warn while the autosave (30 s) still can run. */
const MEM_WARN_MB = +(new URLSearchParams(location.search).get("memwarn") || 1500);
let memWarnLevel = 0;
const checkMem = (mb) => {
  try {
    mb = Math.round(mb); window.__HEAP_MB__ = mb;
    const level = mb >= MEM_WARN_MB + 500 ? 2 : mb >= MEM_WARN_MB ? 1 : 0;
    if (level <= memWarnLevel) return;
    memWarnLevel = level;
    let n = document.getElementById("mem-warn");
    if (!n) {
      n = document.createElement("div"); n.id = "mem-warn";
      n.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99996;color:#fff;font:15px system-ui,sans-serif;padding:8px 14px;border-radius:8px;max-width:92vw";
      document.body.appendChild(n);
    }
    n.style.background = level === 2 ? "rgba(179,38,30,.95)" : "rgba(160,100,0,.95)";
    n.textContent = (level === 2 ? "⚠️ Paměť " + mb + " MB — iPad může tab zabít! " : "Paměť " + mb + " MB — blíží se limit iPadu. ") +
      "Ulož práci (autosave běží) a smaž těžké objekty / sniž Subdivision. ";
    const b = document.createElement("button"); b.textContent = "OK"; b.style.cssText = "margin-left:8px;font-size:15px";
    b.onclick = () => { n.style.display = "none"; }; n.append(b); n.style.display = "block";
  } catch (_) {}
};
/* The render pthread reports heap_mb with its perf sample (WGPU_PERF is always on, see preRun). */
new BroadcastChannel("blender-perf").addEventListener("message", (e) => { if (e.data && e.data.heap_mb) checkMem(e.data.heap_mb); });
/* "Where did my file go?": when Blender reports a written file, say where and offer the file manager. */
const showSaved = (path) => {
  let n = document.getElementById("saved-note");
  if (!n) {
    n = document.createElement("div");
    n.id = "saved-note";
    n.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99997;background:rgba(20,60,20,.94);" +
      "color:#fff;font:15px system-ui,sans-serif;padding:8px 14px;border-radius:8px;max-width:92vw";
    document.body.appendChild(n);
  }
  n.innerHTML = "";
  n.append("💾 Uloženo: " + path + " ");
  const b = document.createElement("button");
  b.textContent = "📁 Stáhnout / složka";
  b.style.cssText = "margin-left:8px;font-size:15px";
  b.onclick = () => { n.style.display = "none"; if (window.__openFileManager) window.__openFileManager(); };
  n.append(b);
  n.style.display = "block";
  clearTimeout(n._t); n._t = setTimeout(() => { n.style.display = "none"; }, 9000);
};
const showMpBlocked = () => {
  let n = document.getElementById("mp-note");
  if (!n) {
    n = document.createElement("div");
    n.id = "mp-note";
    n.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99997;background:rgba(90,50,10,.95);" +
      "color:#fff;font:15px system-ui,sans-serif;padding:8px 14px;border-radius:8px;max-width:92vw";
    n.textContent = "Material Preview je na iPadu zatím vypnutý — dostal jsi „MP Lite“ (Solid s texturami a světlem). Plný MP na vlastní riziko: přidej ?mp=1 do adresy.";
    document.body.appendChild(n);
  }
  n.style.display = "block";
  clearTimeout(n._t); n._t = setTimeout(() => { n.style.display = "none"; }, 9000);
};
/* H19: import operators (File ▸ Import, Image ▸ Open, Append…) open Blender's own file browser, which sees only the wasm FS.
 * Python (_import_assist) prints WEB_FILE_IMPORT when such a browser opens; we offer the real file picker, copy the files to
 * /uploads and hand the directory back to Python via /tmp/web_pick.txt (the browser then lists them). */
const hideImportBar = () => { const n = document.getElementById("import-bar"); if (n) n.style.display = "none"; };
const showImportBar = () => {
  let n = document.getElementById("import-bar");
  if (!n) {
    n = document.createElement("div");
    n.id = "import-bar";
    n.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99997;background:rgba(20,50,90,.95);" +
      "color:#fff;font:15px system-ui,sans-serif;padding:8px 14px;border-radius:8px;max-width:92vw";
    const inp = document.createElement("input");
    inp.type = "file"; inp.multiple = true; inp.id = "import-input"; inp.style.display = "none";
    const b = document.createElement("button");
    b.id = "import-btn"; b.textContent = "📂 Vybrat soubory z počítače…"; b.style.cssText = "margin-left:8px;font-size:15px";
    b.onclick = () => inp.click();
    const upload = async (files, btn, label) => {
      try {
        const FS = window.Module.FS;
        const mk = (dir) => { let cur = ""; for (const part of dir.split("/").filter(Boolean)) { cur += "/" + part; try { FS.mkdir(cur); } catch (e) { /* exists */ } } };
        mk("/uploads");
        let first = null;
        const MODEL = /\.(blend|obj|fbx|glb|gltf|stl|ply|usd[acz]?|abc|dae|svg|x3d|wrl)$/i;
        for (const f of files) {
          btn.textContent = "Nahrávám „" + f.name + "“…";
          const rel = f.webkitRelativePath || f.name;
          const path = "/uploads/" + rel;
          mk(path.slice(0, path.lastIndexOf("/")));
          FS.writeFile(path, new Uint8Array(await f.arrayBuffer()));
          if (!first || (!MODEL.test(first) && MODEL.test(path))) first = path;
        }
        if (first) {
          const i = first.lastIndexOf("/");
          FS.writeFile("/tmp/web_pick.txt", new TextEncoder().encode(first.slice(0, i + 1) + "\n" + first.slice(i + 1)));
          n.style.display = "none";
        }
      } catch (err) { btn.textContent = "Chyba: " + (err && err.message || err); return; }
      btn.textContent = label;
    };
    inp.onchange = async () => { await upload(inp.files, b, "📂 Vybrat soubory z počítače…"); inp.value = ""; };
    const dinp = document.createElement("input");
    dinp.type = "file"; dinp.id = "import-dir-input"; dinp.style.display = "none"; dinp.setAttribute("webkitdirectory", "");
    const db = document.createElement("button");
    db.id = "import-dir-btn"; db.textContent = "📁 Celá složka (model + textury)…"; db.style.cssText = "margin-left:8px;font-size:15px";
    db.onclick = () => dinp.click();
    dinp.onchange = async () => { await upload(dinp.files, db, "📁 Celá složka (model + textury)…"); dinp.value = ""; };
    n.append("Soubor z počítače: ", b, inp, db, dinp);
    document.body.appendChild(n);
  }
  n.style.display = "block";
};
const scan = (t) => {
  telLog(t);
  const sv = /Writing to (\/\S+)|^Saved "([^"]+)"/.exec(t.trim());
  if (sv) showSaved(sv[1] || sv[2]);
  if (/^Blender quit\b/.test(t.trim())) showQuit();
  if (t.includes("WEB_MP_BLOCKED")) showMpBlocked();
  if (t.startsWith("WEB_EXPORT /")) noteExport(t.slice(11).trim());
  if (t.includes("WEB_FILE_IMPORT_END")) hideImportBar();
  else if (t.includes("WEB_FILE_IMPORT")) showImportBar();
  if (t.startsWith("WEB_OPEN_URL ")) {
    const u = t.slice(13).trim();
    if (/^https?:\/\//.test(u)) { window.__LAST_OPEN_URL__ = u; window.open(u, "_blank", "noopener"); }
  }
  if (t.includes("WEBGPU_LOST")) showGpuLost(t.split("WEBGPU_LOST ")[1].split(" ")[0], t.split("WEBGPU_LOST ")[1]);
  if (t.includes("WEBGPU_CONTEXT") && t.includes("real device acquired")) window.__BGUI__.device = true;
  /* First frame that actually drew something (not the black startup clear):
   * swap the splash/console for the live canvas. */
  if (t.includes("WGPU_FIRST_CONTENT") && !window.__BGUI__.window) {
    window.__BGUI__.window = true;
    splashEl.classList.add("done");
    canvas.classList.add("ready");
  }
};
window.__scan = scan;
const canvas = document.getElementById("canvas");
/* H12: optional sharper UI. `?dpr=2` renders at CSS px * 2 (GHOST scales window size/mouse/UI by window.__DPR__);
 * default 1 = unchanged (4x GPU memory at 2, iPad may not survive it). */
window.__DPR__ = Math.min(3, Math.max(1, parseFloat(new URLSearchParams(location.search).get("dpr")) || 1));
const fitCanvas = () => {
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    /* After transferControlToOffscreen() the main thread may not resize the
     * canvas (InvalidStateError on every rotate/resize); emscripten resizes the
     * offscreen canvas itself, so this only matters before the transfer. */
    try {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    } catch (_) { /* offscreen already */ }
  }
};
fitCanvas();
window.addEventListener("resize", fitCanvas);
window.addEventListener("contextmenu", (e) => e.preventDefault());

/* Keep pinch-to-zoom inside Blender instead of zooming the browser page.
 * Under PROXY_TO_PTHREAD emscripten forwards wheel events to the Blender render
 * thread ASYNChronously and, on that proxied path, never calls preventDefault
 * (libhtml5 skips it when a targetThread is set) — so GHOST returning "handled"
 * can't cancel the browser's default in time and a trackpad pinch (ctrl+wheel)
 * zooms the page. We cancel the default here on the main thread, synchronously;
 * the event still reaches emscripten's listener, so Blender receives the wheel
 * and zooms its viewport. `passive:false` is required for preventDefault on
 * wheel to take effect. touch-action:none (CSS) covers touchscreen pinch/pan;
 * gesture* covers Safari's trackpad pinch. */
installTouch(canvas);
const eatGesture = (e) => e.preventDefault();
canvas.addEventListener("wheel", eatGesture, { passive: false });
canvas.addEventListener("gesturestart", eatGesture);
canvas.addEventListener("gesturechange", eatGesture);
canvas.addEventListener("gestureend", eatGesture);
/* Middle-mouse over the canvas triggers the browser's autoscroll widget, which
 * steals MMB (Blender's orbit/pan). Same proxied-event reason emscripten can't
 * cancel it; do it here. dragstart would otherwise start a browser drag during
 * a Blender click-drag. Both still propagate to emscripten -> Blender. */
canvas.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
canvas.addEventListener("dragstart", eatGesture);

/* Route keyboard shortcuts to Blender, not the browser. Same PROXY_TO_PTHREAD
 * problem as the wheel above: emscripten forwards keydown to the render thread
 * asynchronously and never calls preventDefault on that proxied path, so a
 * Ctrl/Cmd shortcut that Blender handles (Ctrl+S save, Ctrl+O open, Ctrl+A
 * select-all, Ctrl+Z undo, …) ALSO triggers the browser default (the "save
 * webpage" dialog for Ctrl+S, etc.). We cancel the default here on the main
 * thread, synchronously, once Blender is running and focus isn't in a form
 * field; preventDefault doesn't stop propagation, so the key still reaches
 * emscripten's listener and Blender receives the shortcut. Plain (unmodified)
 * keys have no meaningful browser default over the canvas, so they're left
 * alone. Browser-reserved combos (Ctrl+W/T/N, Ctrl+Shift+I) ignore
 * preventDefault anyway, so eating them is a harmless no-op. */
const isEditableTarget = (el) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
           el.tagName === "SELECT" || el.isContentEditable);
/* Keys whose STANDALONE (no-modifier) browser default we must also cancel:
 * Tab moves focus off the canvas (after which no key reaches Blender at all),
 * the whitespace/navigation keys scroll the page, Backspace navigates back. */
const NAV_KEYS = new Set([
  "Tab", " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "PageUp", "PageDown", "Home", "End", "Backspace", "/",
]);
window.addEventListener(
  "keydown",
  (e) => {
    if (!window.Module) return; /* Blender not started yet — leave the browser alone. */
    if (isEditableTarget(document.activeElement)) return;
    /* Ctrl/Cmd shortcuts (save/open/undo/…) + focus/scroll/history keys. Plain
     * character keys have no page default over the canvas, so leave them be. */
    /* Ctrl/Cmd+V must keep its default or the browser never fires `paste` (clipboard bridge below). */
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "v" || e.key === "V")) return;
    if (e.ctrlKey || e.metaKey || NAV_KEYS.has(e.key)) e.preventDefault();
  },
  { capture: true },
);

/* Clipboard bridge: text copied outside Blender reaches Blender's (sync) clipboard via the page's
 * `paste` event (trusted, no permission prompt). Blender -> outside goes through putClipboard in C++. */
window.addEventListener("paste", (e) => {
  if (!window.Module || !Module.ccall || isEditableTarget(document.activeElement)) return;
  const t = e.clipboardData && e.clipboardData.getData("text/plain");
  if (typeof t === "string") { try { Module.ccall("blender_web_set_clipboard", null, ["string"], [t]); } catch (_) {} }
}, true);

/* Held keys: when the window loses focus (app switch, Cmd/Alt+Tab, iPad multitasking, devtools) the
 * keyup never arrives and Blender keeps Shift/Ctrl/Alt "stuck" until the key is pressed again.
 * Track keydowns and replay a keyup for each on blur / page hidden. */
const heldKeys = new Map();
window.addEventListener("keydown", (e) => { if (e.isTrusted) heldKeys.set(e.code, { code: e.code, key: e.key, keyCode: e.keyCode }); }, true);
window.addEventListener("keyup", (e) => { heldKeys.delete(e.code); }, true);
const releaseHeldKeys = () => {
  for (const k of heldKeys.values()) {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: k.code, key: k.key, keyCode: k.keyCode, bubbles: true, cancelable: true }));
  }
  if (heldKeys.size) log("KEYS_RELEASED_ON_BLUR " + [...heldKeys.keys()].join(","));
  heldKeys.clear();
};
window.addEventListener("blur", releaseHeldKeys);
document.addEventListener("visibilitychange", () => { if (document.hidden) releaseHeldKeys(); });

/* ---- File ▸ Open hijack: a REAL, lazy mount (no copying) of a folder the
 * user picks on their machine. Blender's wm_open_mainfile invoke (wasm build)
 * calls window.__blenderFileOpenHook() on every File ▸ Open press and forces
 * its file dialog to /mnt. We show the browser's directory picker, enumerate
 * the folder's tree (names only, no file contents), stash the
 * FileSystemDirectoryHandle in IndexedDB, and hand the tree to the custom
 * wasmfs "localdir" backend (localdir_backend.cpp) via wasmfs_mount_localdir.
 * Blender then reads file bytes on demand straight from disk through the
 * backend's async JS hooks (localdir_lib.js). Read-only. Blender's file
 * browser stays hidden until the mount lands; then we call
 * blender_web_file_open_at("/mnt/<folder>") to open it right at the folder. ---- */
const MOUNT_ROOT = "/mnt";

/* Persist the picked handle where the wasmfs proxy worker can read it back
 * (a dedicated DB so we don't touch the wgsl/files schema). One record per
 * mount point; "current" is kept as a legacy fallback key. */
const mountIdbPut = (key, handle) => new Promise((res, rej) => {
  const rq = indexedDB.open("blender-localmount", 1);
  rq.onupgradeneeded = () => {
    const db = rq.result;
    if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles", { keyPath: "key" });
  };
  rq.onsuccess = () => {
    const db = rq.result;
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").put({ key, handle });
    tx.objectStore("handles").put({ key: "current", handle });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  };
  rq.onerror = () => rej(rq.error);
});

/* Read a stored directory handle back from IDB (by mount-point key). */
const mountIdbGet = (key) => new Promise((res) => {
  const rq = indexedDB.open("blender-localmount", 1);
  rq.onupgradeneeded = () => {
    const db = rq.result;
    if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles", { keyPath: "key" });
  };
  rq.onsuccess = () => {
    try {
      const g = rq.result.transaction("handles").objectStore("handles").get(key);
      g.onsuccess = () => res(g.result ? g.result.handle : null);
      g.onerror = () => res(null);
    } catch (e) { res(null); }
  };
  rq.onerror = () => res(null);
});

/* Serve read-write permission promotions for the localdir mount. The backend's
 * write hook runs on a wasmfs proxy worker with NO user activation, so it can't
 * call requestPermission itself; it asks here over a BroadcastChannel. The page
 * still has transient activation for ~5s after the user's Save click, so the
 * prompt (if any) succeeds. Set up once, before any mount. */
const permChannel = new BroadcastChannel("localdir-perm");
permChannel.onmessage = async (e) => {
  const d = e.data;
  if (!d || d.type !== "request") return;
  let granted = false;
  try {
    const dir = (await mountIdbGet(d.mountPoint)) || (await mountIdbGet("current"));
    if (dir && dir.requestPermission) {
      let p = await dir.queryPermission({ mode: "readwrite" });
      if (p !== "granted") p = await dir.requestPermission({ mode: "readwrite" });
      granted = p === "granted";
    }
  } catch (err) {
    log("localdir readwrite promotion failed: " + (err && err.message || err));
  }
  permChannel.postMessage({ type: "response", id: d.id, granted });
};

/* Walk the directory handle, collecting "<D|F>\t<relative/path>" lines. This
 * only lists entries (and getFile() is NOT called) — no bytes are read. */
async function enumerateTree(dirHandle) {
  const lines = [];
  const walk = async (dir, prefix) => {
    for await (const [name, handle] of dir.entries()) {
      const rel = prefix ? prefix + "/" + name : name;
      if (handle.kind === "directory") {
        lines.push("D\t" + rel);
        await walk(handle, rel);
      } else {
        lines.push("F\t" + rel);
      }
    }
  };
  await walk(dirHandle, "");
  return lines;
}

const mountedNames = new Set();
let pickerBusy = false;

/* H17: File System Access pickers (showDirectoryPicker & co.) throw SecurityError in a cross-origin iframe
 * (itch.io runs the game from html-classic.itch.zone). When framed, behave like Safari/Firefox: file
 * <input> for Open (drop modal), blob download for Save. A button offers the full page in a new tab. */
const IS_FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const HAS_FSACCESS = !!window.showDirectoryPicker && !IS_FRAMED;
if (IS_FRAMED) {
  const b = document.createElement("a");
  b.id = "open-new-window";
  b.href = location.href; b.target = "_blank"; b.rel = "noopener";
  b.textContent = "↗ Otevřít v novém okně";
  b.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:900;padding:6px 10px;border-radius:6px;" +
    "background:#222c;color:#ddd;font:13px system-ui,sans-serif;text-decoration:none;";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(b));
  if (document.readyState !== "loading") document.body.appendChild(b);
}

/* Primary path (Chromium): File System Access lazy mount. Returns the mount
 * point (e.g. "/mnt/proj") or null if the user cancelled. */
async function mountViaFileSystemAccess() {
  const dir = await window.showDirectoryPicker({ mode: "read" });
  const mountPoint = MOUNT_ROOT + "/" + dir.name;
  if (!mountedNames.has(dir.name)) {
    await mountIdbPut(mountPoint, dir);
    const lines = await enumerateTree(dir);
    /* Spawns a detached helper pthread and returns immediately; the mount
     * itself must not block the main thread (it creates a proxy worker). */
    const rc = window.Module.ccall(
      "wasmfs_mount_localdir", "number",
      ["string", "string"], [mountPoint, lines.join("\n")]);
    if (rc !== 0) throw new Error("mount spawn failed (" + rc + ")");
    let status = 0;
    for (let i = 0; i < 300 && status === 0; i++) {
      await new Promise((r) => setTimeout(r, 50));
      status = window.Module.ccall("wasmfs_localdir_mount_status", "number", [], []);
    }
    if (status !== 1) throw new Error("mount did not complete (status " + status + ")");
    mountedNames.add(dir.name);
    log("mounted " + lines.length + " entries at " + mountPoint);
  }
  return mountPoint;
}

/* Fallback (Firefox/Safari — no showDirectoryPicker): pop an HTML modal asking
 * the user to drag & drop a folder, then read it via the drag-and-drop entry
 * API (webkitGetAsEntry). The dropped tree is exposed as an on-demand
 * FsProvider (same ProviderBackend as /assets): only the directory listing is
 * walked up front; each file's bytes are read lazily from its File object when
 * Blender actually opens it — no copy. Read-only (drag-drop can't write back;
 * saves go through the blob-download path). Returns the mount point or null. */
function dropModalPick() {
  return new Promise((resolve) => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;" +
      "justify-content:center;background:rgba(0,0,0,.6);font:14px system-ui,sans-serif;color:#ddd;";
    const zone = document.createElement("div");
    zone.id = "localdir-dropzone";
    zone.style.cssText = "width:440px;max-width:86vw;padding:26px;border-radius:10px;background:#1c1c1c;" +
      "border:2px dashed #555;text-align:center;transition:border-color .12s,background .12s;";
    zone.innerHTML =
      "<div style='font-size:17px;font-weight:600;margin-bottom:8px'>Open a folder</div>" +
      "<div style='color:#aaa;line-height:1.5'>Your browser doesn't support the folder picker.<br>" +
      "<b>Drag &amp; drop a folder here</b> to open it.<br>(iPad: choose a file instead)</div>" +
      "<button id='dz-files' style='margin-top:14px;padding:12px 22px;border:0;border-radius:8px;" +
      "background:#e87d0d;color:#111;font:600 16px system-ui;cursor:pointer'>Choose file(s)…</button>" +
      "<input id='dz-input' type='file' multiple style='display:none'>" +
      "<div id='dz-status' style='margin-top:14px;color:#e87d0d;min-height:18px'></div>" +
      "<button id='dz-cancel' style='margin-top:16px;padding:6px 16px;border:0;border-radius:5px;" +
      "background:#333;color:#ddd;cursor:pointer'>Cancel</button>";
    ov.appendChild(zone);
    document.body.appendChild(ov);
    const statusEl = zone.querySelector("#dz-status");
    let done = false;
    const finish = (val) => { if (done) return; done = true; ov.remove(); resolve(val); };

    zone.querySelector("#dz-cancel").onclick = () => finish(null);

    /* File picker (works on iPad Safari / Files app): copy the chosen files into /uploads in the
     * wasm FS and let Blender's file browser open that directory. */
    const fileInput = zone.querySelector("#dz-input");
    zone.querySelector("#dz-files").onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      try {
        const FS = window.Module.FS;
        try { FS.mkdir("/uploads"); } catch (e) { /* exists */ }
        for (const f of fileInput.files) {
          statusEl.textContent = "Loading “" + f.name + "”…";
          FS.writeFile("/uploads/" + f.name, new Uint8Array(await f.arrayBuffer()));
        }
        if (fileInput.files.length) finish("/uploads");
      } catch (err) {
        statusEl.textContent = "Failed: " + (err && err.message || err);
      }
    };
    ov.addEventListener("click", (e) => { if (e.target === ov) finish(null); });

    const hl = (on) => { zone.style.borderColor = on ? "#e87d0d" : "#555"; zone.style.background = on ? "#242018" : "#1c1c1c"; };
    ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); hl(true); }));
    ["dragleave", "dragend"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); hl(false); }));

    zone.addEventListener("drop", async (e) => {
      e.preventDefault(); e.stopPropagation(); hl(false);
      const items = e.dataTransfer && e.dataTransfer.items;
      let rootEntry = null;
      for (let i = 0; items && i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
        if (entry && entry.isDirectory) { rootEntry = entry; break; }
      }
      if (!rootEntry) { statusEl.textContent = "Please drop a folder, not a file."; return; }
      try {
        statusEl.textContent = "Reading “" + rootEntry.name + "”…";
        const mountPoint = await mountDropEntry(rootEntry);
        finish(mountPoint);
      } catch (err) {
        statusEl.textContent = "Failed: " + (err && err.message || err);
      }
    });
  });
}

/* mountId 1 = the dropped-folder provider (0 = /assets). One at a time. */
const DROP_MOUNT = 1;

/* Walk the dropped tree (names only — NO byte reads) and expose it as an
 * on-demand FsProvider backed by the FileSystemFileEntry objects, then mount it
 * read-only at /mnt/<name> via the ProviderBackend. Bytes are pulled lazily
 * (File.arrayBuffer) only when Blender opens a file. */
async function mountDropEntry(rootEntry) {
  const mountPoint = MOUNT_ROOT + "/" + rootEntry.name;
  const readDir = (dirEntry) => new Promise((res, rej) => {
    const reader = dirEntry.createReader();
    const out = [];
    const step = () => reader.readEntries((batch) => {
      if (!batch.length) return res(out);   // readEntries returns in batches
      out.push(...batch); step();
    }, rej);
    step();
  });
  const getFile = (fileEntry) => new Promise((res, rej) => fileEntry.file(res, rej));

  const files = new Map();               // relpath -> FileSystemFileEntry
  const dirs = new Map([["", new Set()]]);
  const walk = async (dirEntry, prefix) => {
    for (const ent of await readDir(dirEntry)) {
      const rel = prefix ? prefix + "/" + ent.name : ent.name;
      const parts = rel.split("/").filter(Boolean);
      if (ent.isDirectory) { addToTree(dirs, parts, true); await walk(ent, rel); }
      else { files.set(rel, ent); addToTree(dirs, parts, false); }
    }
  };
  await walk(rootEntry, "");

  const provider = {
    async stat(path) {
      const p = normalizeAssetPath(path);
      const entry = files.get(p);
      if (entry) { const f = await getFile(entry); return { size: f.size, isDir: false }; }
      if (dirs.has(p)) return { size: 0, isDir: true };
      return null;
    },
    readdir(path) {
      const children = dirs.get(normalizeAssetPath(path));
      if (!children) throw new Error(`drop-fs: no such directory ${path}`);
      return [...children];
    },
    async readFile(path) {
      const entry = files.get(normalizeAssetPath(path));
      if (!entry) throw new Error(`drop-fs: no such file ${path}`);
      const f = await getFile(entry);           // lazy: only when opened
      return new Uint8Array(await f.arrayBuffer());
    },
  };

  Module.geckoProviders = Module.geckoProviders || {};
  Module.geckoProviders[DROP_MOUNT] = provider;
  const rc = window.Module.ccall("blender_web_mount_provider", "number",
                                 ["number", "string"], [DROP_MOUNT, mountPoint]);
  if (rc !== 0) throw new Error("provider mount failed (" + rc + ")");
  log("mounted " + files.size + " files at " + mountPoint + " (drag-drop, on-demand)");
  return mountPoint;
}

/* Save (Chromium, no folder mounted yet): pick a destination folder, mount it,
 * then tell Blender to open its save browser there (blender_web_file_save_at →
 * phase 2). Mirrors the Open folder picker. */
window.__blenderSaveHook = async () => {
  if (pickerBusy) return;
  if (!window.Module || !window.Module.ccall) return;
  pickerBusy = true;
  try {
    const mountPoint = await mountViaFileSystemAccess();
    if (mountPoint) {
      window.Module.ccall("blender_web_file_save_at", null, ["string"], [mountPoint + "/"]);
    }
  } catch (e) {
    if (!(e && e.name === "AbortError")) log("Save folder pick failed: " + (e && e.message || e));
  } finally {
    pickerBusy = false;
  }
};

/* Save (Firefox/Safari): Blender wrote the .blend to an in-memory temp path;
 * read it and download as a blob. */
window.__blenderSaveDownload = (path) => {
  try {
    const data = window.Module.FS.readFile(path); // Uint8Array
    const name = path.split("/").pop() || "untitled.blend";
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    try { window.Module.FS.unlink(path); } catch (e) {}
    log("downloaded " + name + " (" + data.length + " bytes)");
  } catch (e) {
    log("save download failed: " + (e && e.message || e));
  }
};

/* H20: exporters (File ▸ Export, Image ▸ Save As, render save …) write into the wasm FS and nobody hands the file over.
 * WASMFS bypasses the JS FS, so Python (_export_watch) polls /uploads, /tmp, /opfs/home and prints WEB_EXPORT <path> for every new/changed
 * file; after a short quiet period we offer "⬇ Stáhnout" for each. */
const exportPending = new Map();
const noteExport = (path) => {
  exportPending.set(path, Date.now());
  clearTimeout(exportPending._t); exportPending._t = setTimeout(showExportBar, 800);
};
const downloadFSFile = (path) => {
  const data = window.Module.FS.readFile(path);
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([data], { type: "application/octet-stream" }));
  a.href = url; a.download = path.split("/").pop() || "export";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  log("downloaded " + a.download + " (" + data.length + " bytes)");
};
const showExportBar = () => {
  let n = document.getElementById("export-bar");
  if (!n) {
    n = document.createElement("div");
    n.id = "export-bar";
    n.style.cssText = "position:fixed;left:50%;top:52px;transform:translateX(-50%);z-index:99997;background:rgba(20,60,20,.95);" +
      "color:#fff;font:15px system-ui,sans-serif;padding:8px 14px;border-radius:8px;max-width:92vw";
    document.body.appendChild(n);
  }
  n.innerHTML = "";
  const FS = window.Module.FS;
  const files = [...exportPending.keys()].filter((p) => { try { return FS.stat(p).size > 0; } catch (e) { return false; } });
  if (!files.length) { n.style.display = "none"; return; }
  n.append("💾 Export hotový: ");
  for (const p of files.slice(0, 6)) {
    const b = document.createElement("button");
    b.className = "export-dl"; b.dataset.path = p; b.textContent = "⬇ Stáhnout " + p.split("/").pop();
    b.style.cssText = "margin:0 4px;font-size:15px";
    b.onclick = () => { try { downloadFSFile(p); } catch (e) { b.textContent = "Chyba: " + (e && e.message || e); } };
    n.append(b);
  }
  if (files.length > 6) n.append("+" + (files.length - 6) + " dalších ");
  const x = document.createElement("button");
  x.textContent = "✕"; x.style.cssText = "margin-left:8px;font-size:15px";
  x.onclick = () => { exportPending.clear(); n.style.display = "none"; };
  n.append(x);
  n.style.display = "block";
  exportPending.clear(); // další dávka začne novou lištou
};
window.__blenderFileOpenHook = async () => {
  if (pickerBusy) return;
  if (!window.Module || !window.Module.ccall) return;
  pickerBusy = true;
  try {
    /* Relies on transient user activation of the File ▸ Open click (FS-Access
     * path). Cancel (AbortError / null) → do nothing, no file browser. */
    const mountPoint = HAS_FSACCESS
      ? await mountViaFileSystemAccess()
      : await dropModalPick();
    if (mountPoint) {
      /* Only NOW open Blender's file browser, pointed at the folder. */
      window.Module.ccall("blender_web_file_open_at", null, ["string"], [mountPoint + "/"]);
    }
  } catch (e) {
    if (!(e && e.name === "AbortError")) {
      log("File ▸ Open mount failed: " + (e && e.message || e));
    }
  } finally {
    pickerBusy = false;
  }
};

/* ---- Launch: build Module (all the boot wiring) and load blender.js. Gated on
 * the Launch button, which is enabled once both downloads finished above. The
 * WebGPU device itself is acquired on the render pthread (creator.cc bootstrap),
 * so we only sanity-check WebGPU availability here. ---- */
/* M6: after a GPU loss / killed tab iOS can keep the dead page's OPFS file locks, so the next start hangs
 * on "Loading Blender…" with no explanation. If no frame arrives in time, say what to do and offer a
 * start without persistent storage (?safe=1: HOME in memory, no OPFS). */
const SAFE_MODE = new URLSearchParams(location.search).get("safe") === "1";
function startWatchdog() {
  const ms = +(window.__WATCHDOG_MS || 45000);
  setTimeout(() => {
    if (window.__BGUI__.window || document.getElementById("start-hang")) return;
    const b = document.createElement("div");
    b.id = "start-hang";
    b.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;padding:14px 18px;background:#8a5a00;color:#fff;font:16px system-ui;text-align:center";
    b.innerHTML = "Start trvá nezvykle dlouho. Po pádu může iPad držet zámek souborů: <b>zavři tento tab úplně</b> (přepínač aplikací) a otevři stránku znovu. " +
      "<button style='margin-left:12px;font-size:16px' onclick=\"location.search='?safe=1'\">Spustit bez ukládání</button>";
    document.body.appendChild(b);
    telEvent("start_hang", { ms });
    const t = setInterval(() => { if (window.__BGUI__.window) { b.remove(); clearInterval(t); } }, 1000);
  }, ms);
}

async function start() {
  /* WebGPU availability + software-renderer state were already probed and
   * surfaced (probeGpu / the Launch gate); a fatal GPU state keeps the button
   * disabled, so reaching here means we're clear to boot. */
  if (gpuStatus && gpuStatus.fatal) {
    console.error(gpuStatus.message.replace(/<[^>]+>/g, ""));
    return;
  }
  if (gpuStatus && gpuStatus.software) {
    console.warn("WebGPU is using a SOFTWARE renderer — Blender will be extremely slow.");
  }
  setUiPhase("console");
  startBtn.disabled = true;
  startBtn.textContent = "Starting…";
  startWatchdog();

// EEVEE Shadow Pool: výchozí 512 MB (jen shadow atlas) + sondy ≈ 1 GB GPU paměti při Material Preview (měřeno ?perf=1: 1080 MB).
// iPad Safari má malý limit na tab → pro nové soubory / startup scénu 128 MB (-380 MB). Přepsat: ?shadowpool=512 (hodnoty enumu v MB).
const SHADOW_POOL = (new URLSearchParams(location.search).get("shadowpool") || "128").replace(/[^0-9]/g, "") || "128";
const AUTOSAVE_S = (new URLSearchParams(location.search).get("autosave") || "30").replace(/[^0-9]/g, "") || "30";
const UNDO_MB = (new URLSearchParams(location.search).get("undomem") || "300").replace(/[^0-9]/g, "") || "300"; // ?undomem=N limit paměti undo v MB (0 = bez limitu)
const RESET_PREFS = new URLSearchParams(location.search).get("resetprefs") === "1" ? "1" : "0"; // ?resetprefs=1 smaže uložené Preferences
const UI_SCALE = (new URLSearchParams(location.search).get("uiscale") || "").replace(/[^0-9.]/g, ""); // ?uiscale=1.3 → větší UI pro prsty (uloží se do Preferences)
/* H7: Material Preview/Rendered crashes the iPad GPU process (790 MB textures, H6). iPad = touch + Macintosh/iPad UA
 * (iPadOS Safari sends a Mac UA). ?mp=1 opts out, ?ipad=1 forces the guard on (PC test). */
const _qp = new URLSearchParams(location.search);
const MP_GUARD = _qp.get("mp") === "1" ? "0" :
  (_qp.get("ipad") === "1" || (navigator.maxTouchPoints > 1 && /Macintosh|iPad/.test(navigator.userAgent))) ? "1" : "0";
/* H22b: EEVEE „lite“ profil pro plný MP na iPadu (?mp=1) nebo na PC (?mplite=1): menší obrazovkové buffery, bez AA akumulace/GI/volumetrik/stínů. */
const MP_LITE = (_qp.get("mplite") === "1" || (_qp.get("mp") === "1" && _qp.get("ipad") !== "0" && (_qp.get("ipad") === "1" ||
  (navigator.maxTouchPoints > 1 && /Macintosh|iPad/.test(navigator.userAgent))))) ? "1" : "0";
const MP_LITE_PX = (_qp.get("mppx") || "2").replace(/[^0-9]/g, "") || "2"; // ?mppx=1|2|4|8 = preview_pixel_size
const SHADOW_POOL_PY = `import bpy
from bpy.app.handlers import persistent
def _cap_pool():
    try:
        for sc in bpy.data.scenes: sc.eevee.shadow_pool_size = '${SHADOW_POOL}'
    except Exception as e: print('shadowpool', e)
def _cap_pool_opened():
    # iPad: soubor otevřený z disku nese 512 MB shadow pool (+384 MB) → zastropovat jen když je větší než cíl
    try:
        cap = int('${SHADOW_POOL}')
        for sc in bpy.data.scenes:
            if int(sc.eevee.shadow_pool_size) > cap:
                sc.eevee.shadow_pool_size = '${SHADOW_POOL}'; print('SHADOWPOOL capped')
    except Exception as e: print('shadowpool', e)
@persistent
def _on_new(*a):
    if not bpy.data.filepath: _cap_pool()
    elif '${MP_GUARD}' == '1' and '${_qp.get("shadowpool") || ""}' == '': _cap_pool_opened()
# Preferences: --factory-startup nečte userpref a na webu není „quit“, který by je uložil → UI scale, navigace,
# klávesové zkratky apod. se po každém načtení stránky ztrácely. Načíst při startu, ukládat při změně.
import os as _os
_UP = bpy.utils.user_resource('CONFIG') + '/userpref.blend'
try:
    if '${RESET_PREFS}' == '1' and _os.path.exists(_UP): _os.remove(_UP); print('USERPREF reset')
    if _os.path.exists(_UP): bpy.ops.wm.read_userpref(); print('USERPREF loaded')
except Exception as e: print('USERPREF load ERR', e)
try:
    if '${UI_SCALE}': bpy.context.preferences.view.ui_scale = max(0.5, min(3.0, float('${UI_SCALE}'))); print('UISCALE set ${UI_SCALE}', flush=True)
except Exception as e: print('UISCALE ERR', e)
# Undo paměť: každý undo krok s velkou změnou meshe drží plnou kopii (fuzz: halda 1→3,7 GB za 40 těžkých kroků).
# iPad to nepřežije → výchozí limit ${UNDO_MB} MB (Preferences ▸ System ▸ Undo Memory Limit; ?undomem=0 = bez limitu).
try:
    if float('${UNDO_MB}') > 0 and bpy.context.preferences.edit.undo_memory_limit == 0: bpy.context.preferences.edit.undo_memory_limit = int(float('${UNDO_MB}'))
except Exception as e: print('UNDOMEM ERR', e)
# H7: na iPadu zatím Material Preview/Rendered shazuje GPU → místo toho Solid „MP Lite“ (H22a) + hláška (JS ji zachytí z WEB_MP_BLOCKED).
def _mp_guard():
    try:
        for win in bpy.context.window_manager.windows:
            for a in win.screen.areas:
                if a.type == 'VIEW_3D':
                    for sp in a.spaces:
                        if sp.type == 'VIEW_3D' and sp.shading.type in {'MATERIAL', 'RENDERED'}:
                            sh = sp.shading; sh.type = 'SOLID'
                            # H22a „MP Lite“: Workbench s texturami z materiálů, studiové světlo, bez EEVEE (show_shadows NE: na webu zmizí model, viz BACKLOG H22a)
                            sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_specular_highlight = True
                            sh.show_shadows = False; sh.show_cavity = True; sh.use_dof = False
                            print('WEB_MP_BLOCKED', flush=True)
    except Exception as e: print('MPGUARD ERR', e)
    return 0.5
if '${MP_GUARD}' == '1': bpy.app.timers.register(_mp_guard, first_interval=1.0, persistent=True)
# H19: import operátory (File ▸ Import, Image ▸ Open, Append…) otevřou vnitřní file browser, který vidí jen wasm FS.
# Pokud takový browser vznikne, řekni stránce (WEB_FILE_IMPORT → tlačítko „Vybrat soubory z počítače“); stránka nahraje
# soubory do /uploads a zapíše /tmp/web_pick.txt (adresář + jména) → tady je nastavíme do file browseru.
_imp = {'seen': set()}
def _is_import_op(idn):
    return ('import' in idn or idn in {'image.open', 'sound.open', 'clip.open', 'text.open', 'wm.append', 'wm.link'}) and 'export' not in idn
def _import_assist():
    try:
        cur = set()
        pick = None
        if _os.path.exists('/tmp/web_pick.txt'):
            pick = open('/tmp/web_pick.txt').read().split('\\n'); _os.remove('/tmp/web_pick.txt')
        for win in bpy.context.window_manager.windows:
            for a in win.screen.areas:
                if a.type != 'FILE_BROWSER': continue
                for sp in a.spaces:
                    if sp.type != 'FILE_BROWSER' or sp.active_operator is None or not _is_import_op(sp.active_operator.bl_idname): continue
                    key = sp.as_pointer(); cur.add(key)
                    if key not in _imp['seen']:
                        _imp['seen'].add(key); print('WEB_FILE_IMPORT ' + sp.active_operator.bl_idname, flush=True)
                    if pick and len(pick) > 1:
                        sp.params.directory = pick[0].encode(); sp.params.filename = pick[1]
                        print('WEB_FILE_IMPORT_PICKED ' + pick[0] + ' ' + str(len(pick) - 1), flush=True)
        if _imp['seen'] - cur:
            _imp['seen'] &= cur
            if not cur: print('WEB_FILE_IMPORT_END', flush=True)
    except Exception as e: print('IMPORT_ASSIST ERR', e)
    return 0.4
bpy.app.timers.register(_import_assist, first_interval=2.0, persistent=True)
# H20: export watcher — WASMFS obchází JS FS, proto Python hlídá adresáře a hlásí nové/změněné soubory (WEB_EXPORT <cesta>).
_ew = {'snap': None, 'pend': {}}
_EW_EXT = ('.obj', '.mtl', '.fbx', '.glb', '.gltf', '.bin', '.stl', '.ply', '.usd', '.usda', '.usdc', '.usdz', '.abc', '.dae', '.svg', '.x3d', '.wrl', '.png', '.jpg', '.jpeg', '.exr', '.tif', '.tiff', '.bmp', '.tga', '.hdr', '.webp', '.dds', '.mp4', '.avi', '.mkv', '.mov', '.wav', '.mp3', '.flac', '.ogg', '.pdf', '.json', '.csv', '.zip', '.vdb', '.bvh', '.blend')
def _ew_scan():
    out = {}
    for root, depth in (('/uploads', 3), ('/tmp', 1), ('/opfs/home', 2), ('/home', 2), (_os.getcwd(), 1)):
        stack = [(root, 0)]
        while stack:
            d, k = stack.pop()
            try: it = list(_os.scandir(d))
            except Exception: continue
            for e in it:
                try:
                    if e.is_dir(follow_symlinks=False):
                        if k + 1 < depth and e.name not in ('.config', '__pycache__', '.cache'): stack.append((e.path, k + 1))
                    elif e.name.lower().endswith(_EW_EXT) and 'autosave' not in e.name and not e.name.endswith(('.blend1', '.blend@')) and e.name != 'quit.blend':
                        st = e.stat(); out[e.path] = (st.st_mtime_ns, st.st_size)
                except Exception: pass
    return out
def _export_watch():
    try:
        cur = _ew_scan()
        if _ew['snap'] is None: _ew['snap'] = cur; return 0.5
        for p, v in cur.items():
            if _ew['snap'].get(p) == v: continue
            if _ew['pend'].get(p) == v:
                _ew['snap'][p] = v; del _ew['pend'][p]
                if v[1] > 0: print('WEB_EXPORT ' + p, flush=True)
            else: _ew['pend'][p] = v
        for p in list(_ew['snap']):
            if p not in cur: del _ew['snap'][p]
    except Exception as e: print('EXPORT_WATCH ERR', e)
    return 0.5
bpy.app.timers.register(_export_watch, first_interval=3.0, persistent=True)
def _save_prefs():
    try:
        if bpy.context.preferences.is_dirty: bpy.ops.wm.save_userpref(); print('USERPREF saved')
    except Exception as e: print('USERPREF save ERR', e)
    return 5.0
bpy.app.timers.register(_save_prefs, first_interval=10.0, persistent=True)
# Help ▸ Manual, odkazy v dialozích: webbrowser.open() na webu nic nedělá → pošli URL stránce (main.js scan → window.open).
import webbrowser as _wb, sys as _sys
class _WebBrowser(_wb.BaseBrowser):
    def open(self, url, new=0, autoraise=True):
        print('WEB_OPEN_URL ' + url); _sys.stdout.flush(); return True
_wb.register('blender-web', None, _WebBrowser('blender-web'), preferred=True)
_cap_pool()
bpy.app.handlers.load_post.append(_on_new)
def _mp_lite_eevee(*a):
    if '${MP_LITE}' != '1': return
    ok = []
    for sc in bpy.data.scenes:
        for obj, name, val in ((sc.render, 'preview_pixel_size', '${MP_LITE_PX}'), (sc.eevee, 'taa_samples', 1), (sc.eevee, 'use_shadows', False),
                               (sc.eevee, 'use_raytracing', False), (sc.eevee, 'use_volumetric_shadows', False), (sc.eevee, 'use_gtao', False)):
            try:
                if hasattr(obj, name): setattr(obj, name, val); ok.append(name)
            except Exception as e: print('MPLITE_EEVEE', name, e)
    print('MPLITE_EEVEE applied ' + ','.join(sorted(set(ok))), flush=True)
_mp_lite_eevee()
bpy.app.handlers.load_post.append(_mp_lite_eevee)
# Autosave: Blenderův vlastní autosave timer na webu nezapíše nic (ověřeno 3 min, 1 min interval) a /tmp je v paměti.
# iPad Safari zabíjí tab na pozadí → vlastní kopie do /opfs/home/_autosave.blend (viditelná v 📁), jen když je scéna změněná.
import os, time
_AS = '/opfs/home/_autosave.blend'
_AS_EVERY = float('${AUTOSAVE_S}')
_as = {'wait': _AS_EVERY}
try:
    if os.path.exists(_AS): os.replace(_AS, '/opfs/home/_autosave_prev.blend'); print('AUTOSAVE previous session kept as /opfs/home/_autosave_prev.blend')
except Exception as e: print('AUTOSAVE rotate ERR', e)
_PREV = '/opfs/home/_autosave_prev.blend'
_offer = {'tries': 0}
def _offer_restore():
    # Po pádu/zavření tabu nabídnout poslední autosave (popup v Blenderu, funguje i prstem).
    _offer['tries'] += 1
    try:
        wm = bpy.context.window_manager
        if not wm.windows:
            return 2.0 if _offer['tries'] < 30 else None
        if bpy.data.filepath or not os.path.exists(_PREV) or os.path.getsize(_PREV) < 1000: return None
        def _draw(self, ctx):
            op = self.layout.operator('wm.open_mainfile', text='Obnovit poslední práci', icon='FILE_REFRESH')
            op.filepath = _PREV
            self.layout.label(text='Soubor: _autosave_prev.blend (též v 📁)')
        print('RESTORE_OFFER', os.path.getsize(_PREV), flush=True)
        wm.popup_menu(_draw, title='Našel jsem rozdělanou práci', icon='INFO')
    except Exception as e: print('RESTORE_OFFER ERR', e)
    return None
def _file_menu_restore(self, ctx):
    if os.path.exists(_PREV) and os.path.getsize(_PREV) > 1000:
        self.layout.separator()
        self.layout.operator('wm.open_mainfile', text='Obnovit poslední práci (autosave)', icon='FILE_REFRESH').filepath = _PREV
try: bpy.types.TOPBAR_MT_file.append(_file_menu_restore)
except Exception as e: print('RESTORE menu ERR', e)
bpy.app.timers.register(_offer_restore, first_interval=5.0, persistent=True)
def _autosave():
    try:
        if bpy.data.is_dirty and bpy.context.window_manager.windows:
            t = time.time()
            bpy.ops.wm.save_as_mainfile(filepath=_AS, copy=True, compress=True)
            dt = time.time() - t
            _as['wait'] = max(_AS_EVERY, dt * 20)
            print('AUTOSAVE', os.path.getsize(_AS), round(dt, 2))
    except Exception as e: print('AUTOSAVE ERR', e)
    return _as['wait']
bpy.app.timers.register(_autosave, first_interval=_AS_EVERY, persistent=True)`;
window.Module = {
  arguments: ["--factory-startup", "--python-expr", SHADOW_POOL_PY, ...(window.__BARGS || [])],
  canvas,
  print: (t) => { log(t); scan(t); },
  printErr: (t) => { log("[err] " + t); scan(t); },
  instantiateWasm: (imports, cb) => {
    /* The 197 MB decompressed wasm is only needed to compile; drop it afterwards (M4: -197 MB on iPad). */
    WebAssembly.instantiate(wasmBytes, imports).then((o) => { wasmBytes = null; cb(o.instance, o.module); });
    return {};
  },
  preRun: [function () {
    try {
      if (!SAFE_MODE) ENV.BLENDER_WEB_OPFS = "1";
      ENV.HOME = SAFE_MODE ? "/tmp" : "/opfs/home";
      /* Assets are mounted zero-copy at /assets (provider backend), not
       * extracted to OPFS. BLENDER_SYSTEM_RESOURCES holds scripts/ + datafiles/;
       * BLENDER_SYSTEM_PYTHON expects <dir>/lib/python3.13. */
      ENV.BLENDER_SYSTEM_RESOURCES = "/assets/5.3";
      ENV.BLENDER_SYSTEM_PYTHON = "/assets";
      ENV.PYTHONHOME = "/assets";
      ENV.WGSL_SEED_URL = new URL("wgsl-cache.json", location.href).href; /* H22f: worker si relativní URL neumí složit */
      if (window.__CAPENV) for (const k in window.__CAPENV) ENV[k] = window.__CAPENV[k];
      ENV.WGPU_PERF = "1"; /* cheap; also feeds the memory guard */
      if (new URLSearchParams(location.search).get("perf") === "1" && new URLSearchParams(location.search).get("reglog") === "1") ENV.WGPU_REGIONLOG = "1";
      if (new URLSearchParams(location.search).get("passlog") === "1") ENV.WGPU_PASSLOG = "1";
      if (new URLSearchParams(location.search).get("nocompute") === "1") ENV.WGPU_NO_COMPUTE = "1";
      if (new URLSearchParams(location.search).get("compilelog") === "1") ENV.WGPU_LOG_COMPILE = "1";
      if (new URLSearchParams(location.search).get("drawlog") === "1") ENV.WGPU_LOG_DRAWS = "1";
      if (new URLSearchParams(location.search).get("iconprev") === "1") ENV.BLENDER_WEB_ICON_PREVIEWS = "1";
    } catch (e) { log("preRun ENV: " + e); }

    /* Register the in-memory tar FsProvider for the WasmFS ProviderBackend
     * (demo/provider_backend.cpp + provider-fs.js). Its hooks run on the
     * runtime main thread and read Module.geckoProviders[mountId] here. The
     * mount itself is done in C (creator.cc) once the runtime is up, gated on
     * BLENDER_WEB_ASSET_PROVIDER — mirrors gecko's embed-init.cpp. mountId 0. */
    Module.geckoProviders = { 0: assetProvider };
    ENV.BLENDER_WEB_ASSET_PROVIDER = "1";

    addRunDependency("wgsl-cache");
    (async () => {
      const db = await idbOpen();
      const rows = await new Promise((res, rej) => {
        const rq = db.transaction("wgsl").objectStore("wgsl").getAll();
        rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
      });
      let seed = [];
      try {
        const rsp = await fetch("wgsl-cache.json");
        if (rsp.ok) seed = await rsp.json();
      } catch (e) {}
      /* Safari/WebKit bug 275010: module-scope `override NAME : T = EXPR;` WITHOUT
       * @id (value computed from another override, Tint emits it for `if (spec_const)`
       * ) may make the pipeline invalid. Inline EXPR into the uses instead (same
       * meaning, overrides are allowed in function bodies). ?noovfix=1 turns it off. */
      const inlineComputedOverrides = (src) => {
        if (typeof src !== "string") return src;
        const re = /^override\s+(\w+)\s*:\s*\w+\s*=\s*([^;]+);[ \t]*\n?/gm;
        let out = src, m, found = [];
        while ((m = re.exec(src)) !== null) {
          const before = src.slice(src.lastIndexOf("\n", m.index - 1) + 1, m.index);
          const prevLine = src.slice(0, Math.max(m.index - 1, 0)).split("\n").pop();
          if (/@id\(\d+\)/.test(before) || /^\s*@id\(\d+\)\s*$/.test(prevLine)) continue;
          found.push([m[0], m[1], m[2].trim()]);
        }
        for (const [line, name, expr] of found) {
          out = out.replace(line, "");
          out = out.replace(new RegExp("(?<![\\w.])" + name + "(?!\\w)", "g"), "(" + expr + ")");
        }
        return out;
      };
      const noOvFix = new URLSearchParams(location.search).has("noovfix");
      const fixw = (w) => (noOvFix ? w : inlineComputedOverrides(w));
      globalThis.__WGSL_CACHE__ = new Map([...seed.map(([k, w]) => [k, fixw(w)]),
                                           ...rows.map((r) => [r.key, fixw(r.wgsl)])]);
      globalThis.__WGSL_CACHE_PUT__ = (k, v) => {
        try { db.transaction("wgsl", "readwrite").objectStore("wgsl").put({ key: k, wgsl: v }); }
        catch (e) {}
      };
    })().catch((e) => log("wgsl cache: " + e)).finally(() => removeRunDependency("wgsl-cache"));
  }],
  onRuntimeInitialized: () => {
    /* Parent of the local-folder mount points (wm_open_mainfile also creates
     * it wasm-side; this covers sessions where the dialog never opened). */
    try { window.Module.FS.mkdir(MOUNT_ROOT); } catch (e) { /* exists */ }
    /* Tell the wasm side whether the File System Access API is available, so
     * Save can pick a folder (Chromium) or fall back to a blob download
     * (Firefox/Safari). */
    try {
      window.Module.ccall("blender_web_set_has_fsaccess", null, ["number"],
                          [HAS_FSACCESS ? 1 : 0]);
    } catch (e) { log("set_has_fsaccess: " + e); }
  },
  onAbort: (w) => {
    let st = ""; try { st = String(new Error().stack).slice(0, 1500); } catch (e) {}
    telEvent("abort", { what: String(w).slice(0, 200), stack: st });
    log("ABORT: " + w); status("Failed to start: " + w);
  },
};

/* iOS gives no 1 GB wasm memory right after a GPU crash: instantiation throws "RangeError: Out of memory"
 * and the splash would stay on "Loading Blender…" forever. Tell the user what to do instead. */
const showFatalPanel = (title, text) => {
  if (document.getElementById("oom-overlay")) return;
  const o = document.createElement("div");
  o.id = "oom-overlay";
  o.style.cssText = "position:fixed;inset:0;z-index:99999;background:#b00020;color:#fff;display:flex;" +
    "flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;" +
    "font:600 28px/1.4 -apple-system,sans-serif";
  o.innerHTML = "<div style='font-size:64px'>⚠️</div><div>" + title + "</div>" +
    "<div style='font-weight:400;font-size:22px;margin-top:16px;max-width:640px'>" + text + "</div>";
  document.body.appendChild(o);
};
const OOM_RE = /out of memory|Cannot allocate Wasm memory/i;
const onOom = () => {
  status("Nedostatek paměti. Zavři tento tab (a ostatní těžké taby), otevři stránku znovu.");
  showFatalPanel("Safari nedalo Blenderu paměť",
    "Zavři ostatní taby s Blenderem (i cizí), pak tento tab úplně zavři (přejeď a zavři) " +
    "a otevři stránku znovu. Po pádu GPU může paměť uvolnit až chvíli po zavření. " +
    "V soukromém tabu je limit paměti nižší — otevři Blender v normálním tabu.");
};
addEventListener("unhandledrejection", (e) => {
  if (OOM_RE.test(String(e.reason && (e.reason.message || e.reason)))) onOom();
});
/* H16: pthread workers report `UnknownError ... out of memory` as window `error` events, not rejections. */
addEventListener("error", (e) => {
  if (OOM_RE.test(String(e.message || (e.error && e.error.message) || ""))) onOom();
});
/* H16: Safari private tabs: IndexedDB is unusable there (and memory is lower) — say so clearly. */
try {
  const prq = indexedDB.open("blender-probe");
  prq.onerror = () => showFatalPanel("Soukromý tab není podporován",
    "Otevři Blender v normálním tabu Safari (ne v soukromém).");
  prq.onsuccess = () => { try { prq.result.close(); } catch (e) {} };
} catch (e) {
  showFatalPanel("Soukromý tab není podporován", "Otevři Blender v normálním tabu Safari (ne v soukromém).");
}

  /* H14: Safari fails pipelines with "Failed to evaluate override value". Never send it an
   * `override`: at pipeline creation, rewrite the module's WGSL so every override becomes a
   * `const` with the value from `constants` (or its default), and drop `constants`.
   * ?overrides=1 keeps the original path. */
  const ovrPatch = function () {
    if (!globalThis.GPUDevice) return;
    const P = GPUDevice.prototype;
    const srcOf = new WeakMap(), specCache = new Map();
    const stats = (globalThis.__OVR_STATS = { specialized: 0, leftover: 0, modules: 0, ovModules: 0, pipes: 0 });
    const rep = () => { if (stats.specialized <= 3 || stats.specialized % 100 === 0) console.log("OVR_SPEC " + JSON.stringify(stats)); };
    const origCSM = P.createShaderModule;
    P.createShaderModule = function (desc) {
      const m = origCSM.call(this, desc);
      stats.modules++;
      if (desc && typeof desc.code === "string" && /\boverride\b/.test(desc.code)) { srcOf.set(m, desc); stats.ovModules++; }
      /* H15b: Safari (tier1, no tier2) only allows read_write storage textures for r32float/r32uint/r32sint;
       * anything else voids the whole command buffer ("Storage texture layout not valid"). Flag it on every
       * browser so the PC tests catch it too (shading_test fails on this line). */
      if (desc && typeof desc.code === "string") {
        for (const x of desc.code.matchAll(/(\w+)\s*:\s*texture_storage_\w+<(\w+),\s*read_write>/g)) {
          if (!/^r32(float|uint|sint)$/.test(x[2])) console.log("WGPU_RW_STORAGE_BAD '" + (desc.label || "?") + "' var=" + x[1] + " fmt=" + x[2]);
        }
      }
      return m;
    };
    const lit = (t, v) => {
      if (t === "bool") return v ? "true" : "false";
      if (t === "u32") return String(v >>> 0);
      if (t === "i32") return String(v | 0);
      return Number.isInteger(v) ? v.toFixed(1) : String(v);
    };
    const specialize = (dev, stage) => {
      if (!stage) return;
      const desc = srcOf.get(stage.module);
      if (!desc) return;
      const consts = stage.constants || {};
      const key = desc.code + "\0" + JSON.stringify(consts);
      let mod = specCache.get(key);
      if (!mod) {
        const code = desc.code.replace(
          /(?:@id\((\d+)\)\s*)?override\s+(\w+)\s*:\s*(\w+)\s*(?:=\s*([^;]+))?;/g,
          (all, id, name, type, def) => {
            let v = consts[name];
            if (v === undefined && id !== undefined) v = consts[id];
            if (v !== undefined) return `const ${name} : ${type} = ${lit(type, v)};`;
            if (def !== undefined) return `const ${name} : ${type} = ${def.trim()};`;
            return all;
          });
        if (/\boverride\b/.test(code)) stats.leftover++;
        stats.specialized++;
        mod = origCSM.call(dev, { ...desc, code });
        specCache.set(key, mod);
        rep();
      }
      stage.module = mod;
      delete stage.constants;
    };
    const origRP = P.createRenderPipeline, origCP = P.createComputePipeline;
    P.createRenderPipeline = function (d) {
      stats.pipes++;
      specialize(this, d.vertex); specialize(this, d.fragment);
      return origRP.call(this, d);
    };
    P.createComputePipeline = function (d) {
      specialize(this, d.compute);
      return origCP.call(this, d);
    };
  };
  if (!new URLSearchParams(location.search).has("overrides")) {
    ovrPatch(); /* GPU calls run in a pthread worker: patch workers too */
    const OrigWorker = globalThis.Worker;
    globalThis.Worker = class extends OrigWorker {
      constructor(url, opts) {
        if (opts && String(opts.name).startsWith("em-pthread") && !opts.type) {
          const abs = new URL(String(url), location.href).href;
          url = URL.createObjectURL(new Blob(["(" + ovrPatch + ")();importScripts(" + JSON.stringify(abs) + ");"],
                                              { type: "text/javascript" }));
        }
        super(url, opts);
      }
    };
  }

  log("loading Blender…");
  const s = document.createElement("script");
  s.src = "blender.js";
  document.body.appendChild(s);
}

startBtn.onclick = () => { void start(); };
/* The button's enabled state is driven by refreshStartGate() (asset readiness +
 * GPU status + software-ack), not toggled unconditionally here. */
refreshStartGate();
