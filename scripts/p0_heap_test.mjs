// P0: které velké ArrayBuffery drží hlavní vlákno (před Launch a po startu UI). CDP Runtime.queryObjects(ArrayBuffer.prototype).
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--js-flags=--expose-gc", "--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let cdp;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function bufs(label) {
  cdp = await page.context().newCDPSession(page);
  await page.evaluate(() => window.gc && window.gc());
  for (const proto of ["ArrayBuffer.prototype", "SharedArrayBuffer.prototype", "Uint8Array.prototype"]) {
    const p = await cdp.send("Runtime.evaluate", { expression: proto });
    const q = await cdp.send("Runtime.queryObjects", { prototypeObjectId: p.result.objectId });
    const r = await cdp.send("Runtime.callFunctionOn", { objectId: q.objects.objectId, returnByValue: true,
      functionDeclaration: "function(){ const a = this.map(b => b.byteLength).sort((x,y)=>y-x); return { n: a.length, top: a.slice(0, 8).map(n => +(n/1048576).toFixed(1)) }; }" });
    console.log("HEAP " + label + " " + proto + " MB: " + JSON.stringify(r.result.value ?? r) + " q=" + JSON.stringify(q.objects).slice(0, 200));
  }
  if (process.env.SNAP) { const fs = await import("node:fs"); const f = fs.openSync("heap_" + label + ".heapsnapshot", "w");
    cdp.on("HeapProfiler.addHeapSnapshotChunk", (e) => fs.writeSync(f, e.chunk));
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false }); fs.closeSync(f); }
  console.log("HEAP " + label + " used " + Math.round(await page.evaluate(() => performance.memory.usedJSHeapSize) / 1048576));
}
const q = "?tel=1" + (process.env.Q ? "&" + process.env.Q : "");
await page.goto("http://localhost:5173/" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
const L = page.getByRole("button", { name: /Launch Blender/ });
for (let i = 0; i < 120 && !(await L.isEnabled().catch(() => false)); i++) await wait(1000);
await wait(1500); await bufs("before_launch");
await L.click();
for (let i = 0; i < 100; i++) { await wait(3000); if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; }
await wait(15000); await bufs("ui_up");
await browser.close();
