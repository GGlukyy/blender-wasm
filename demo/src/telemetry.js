/* M0 telemetry: iPad -> dev server (/__telemetry -> out/ipad/tel_<date>.jsonl).
 * On with ?tel=1, or on the Vite dev server in a real browser (?tel=0 turns it off; automated tests keep it off, it perturbs timing). */
const q = new URLSearchParams(location.search).get("tel");
export const telEnabled = !(typeof __RELEASE__ !== "undefined" && __RELEASE__) && (q === "1" || (import.meta.env.DEV && q !== "0" && !navigator.webdriver));

const sid = Math.random().toString(36).slice(2, 8);
const t0 = performance.now();
const ring = (n) => { const a = []; return { push(x) { a.push(x); if (a.length > n) a.shift(); }, all: () => a.slice() }; };
const logs = ring(15), inputs = ring(12), events = [];
let perf = null, gmem = null, adapter = null, queue = [];

const send = (o, beacon) => {
  o.sid = sid; o.t = Math.round(performance.now() - t0);
  const line = JSON.stringify(o) + "\n";
  if (beacon && navigator.sendBeacon) { navigator.sendBeacon("/__telemetry", line); return; }
  queue.push(line);
};
const flush = () => {
  if (!queue.length) return;
  const body = queue.join(""); queue = [];
  fetch("/__telemetry", { method: "POST", body, keepalive: true }).catch(() => {});
};

const rpRing = ring(6); let gpuerrs = 0;
/* H9-0: Safari validation messages (uncapturederror) -> own record with the last passes/logs, max 20 per session. */
let lastErr = "", lastErrT = 0;
const gpuErr = (msg) => {
  const n = performance.now(); if (msg === lastErr && n - lastErrT < 1000) return; lastErr = msg; lastErrT = n;
  if (gpuerrs++ < 20) send({ kind: "gpuerr", msg: String(msg).slice(0, 500), passes: rpRing.all(), logs: logs.all() }, true);
};
export function telLog(t) {
  if (!telEnabled) return;
  if (/^WGPU_RP/.test(t)) rpRing.push(String(t).slice(0, 160));
  if (t.startsWith("WGPU_UNCAPTURED")) gpuErr(t.slice(15).trim());
  if (!/^WGPU_(RP|FIRST|BATCH|FLUSH_WHY)/.test(t)) logs.push(String(t).slice(0, 200));
}
export function telEvent(kind, data) { if (telEnabled) send({ kind, ...data }, kind === "lost"); }
export function telAdapterLimits(a) {
  if (!telEnabled || adapter) return;
  adapter = true;
  const limits = {}; for (const k in a.limits) limits[k] = a.limits[k];
  send({ kind: "adapter", info: a.info ? { vendor: a.info.vendor, architecture: a.info.architecture, device: a.info.device, description: a.info.description } : null, limits, features: [...a.features] });
}

export function installTelemetry() {
  if (!telEnabled) return;
  send({ kind: "start", url: location.search, dpr: devicePixelRatio, screen: [screen.width, screen.height], inner: [innerWidth, innerHeight], isolated: crossOriginIsolated, mem: navigator.deviceMemory || null });
  try {
    new BroadcastChannel("blender-perf").onmessage = (e) => { perf = e.data; };
    new BroadcastChannel("blender-gpuerr").onmessage = (e) => gpuErr(e.data);
    new BroadcastChannel("blender-gpumem").onmessage = (e) => {
      gmem = e.data; window.__GPUMEM__ = gmem;
      if (gmem.lost_reason) send({ kind: "lost_detail", reason: gmem.lost_reason, msg: gmem.lost_message, gpu: gmem }, true);
    };
  } catch (e) {}
  addEventListener("error", (e) => send({ kind: "error", msg: String(e.message).slice(0, 300), src: e.filename, line: e.lineno }));
  addEventListener("unhandledrejection", (e) => send({ kind: "rejection", msg: String(e.reason && (e.reason.stack || e.reason)).slice(0, 400) }));
  for (const ev of ["keydown", "pointerdown"]) {
    addEventListener(ev, (e) => inputs.push(Math.round(performance.now() - t0) + " " + ev + " " + (e.key || e.pointerType + ":" + e.button)), true);
  }
  /* D1: render-thread heartbeat (shared wasm memory, see gpu/webgpu/webgpu_heartbeat.hh). Read on the
   * main thread so it is still reported when the render pthread is frozen. */
  const PHASES = ["", "draw", "shader_module", "pipeline", "map_read", "submit", "present"];
  let hbPtr = 0, hbSeq = -1, hbSince = 0;
  const heartbeat = (o) => {
    const M = window.Module;
    if (!M || !M.ccall) return;
    if (!hbPtr) hbPtr = M.ccall("wgpu_hb_ptr", "number", [], []);
    if (!hbPtr) return;
    const buf = M.HEAPU8.buffer; /* HEAPU8 is exported; M.wasmMemory is not (touching it aborts) */
    const hb = new Uint32Array(buf, hbPtr, 8);
    const seq = Atomics.load(hb, 0), now = performance.now();
    if (seq !== hbSeq) { hbSeq = seq; hbSince = now; }
    o.rt_frame = Atomics.load(hb, 1); o.rt_phase = PHASES[Atomics.load(hb, 2)] || "?";
    o.rt_phase_ms = Math.round(now - hbSince); o.rt_malloc_mb = Math.round(Atomics.load(hb, 4) / 1048576);
    o.main_heap_mb = Math.round(buf.byteLength / 1048576);
  };
  const sample = () => {
    const o = { kind: "sample", vis: document.visibilityState, logs: logs.all(), inputs: inputs.all() };
    if (perf) {
      o.fps = Math.round(1000 / perf.dt_avg_ms); o.ms = +perf.dt_avg_ms.toFixed(1); o.msmax = Math.round(perf.dt_max_ms);
      o.submits = perf.submits; o.passes = perf.passes; o.tex = perf.tex; o.tex_mb = perf.tex_mb;
      o.imm_bufs = perf.imm_bufs; o.imm_kb = perf.imm_kb; o.heap_mb = Math.round(perf.heap_mb); o.heap_used_mb = Math.round(perf.heap_used_mb);
    }
    if (gmem) o.gpu = gmem;
    try { heartbeat(o); } catch (e) { o.rt_err = String(e).slice(0, 80); }
    if (performance.memory) { o.js_used_mb = Math.round(performance.memory.usedJSHeapSize / 1048576); o.js_total_mb = Math.round(performance.memory.totalJSHeapSize / 1048576); }
    send(o);
  };
  setInterval(() => { try { sample(); } catch (e) { send({ kind: 'sample_err', msg: String(e && e.stack || e).slice(0, 300) }); } flush(); }, /[?&]mp=1/.test(location.search) ? 1000 : 2000); // H22e: v MP po 1 s, ať je před případným pádem co nejnovější vzorek
  const bye = (why) => () => { sample(); send({ kind: why }, false); flush(); if (navigator.sendBeacon && queue.length === 0) navigator.sendBeacon("/__telemetry", JSON.stringify({ sid, kind: why + "_beacon", t: Math.round(performance.now() - t0) }) + "\n"); };
  addEventListener("pagehide", bye("pagehide"));
  document.addEventListener("visibilitychange", bye("visibility"));
}
