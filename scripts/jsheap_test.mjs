// B3: kdo drží JS heap hlavního vlákna? Sampling heap profiler (CDP) od načtení stránky do 40 s po Launch; vypíše největší místa (živá paměť).
const { chromium } = await import(process.env.PW || "playwright");
const Q = process.env.Q || "webkit_sim=1&ipad=1&cycles=0";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send("HeapProfiler.enable"); await cdp.send("HeapProfiler.startSampling", { samplingInterval: 32768 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto("http://localhost:5173/?" + Q, { waitUntil: "load" });
const used = async () => (await cdp.send("Runtime.getHeapUsage")).usedSize / 1048576 | 0;
console.log("JSHEAP after load", await used());
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 120; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
console.log("JSHEAP after boot", await used()); await wait(20000); await cdp.send("HeapProfiler.collectGarbage"); await wait(1000);
console.log("JSHEAP after gc", await used());
const { profile } = await cdp.send("HeapProfiler.stopSampling");
const agg = new Map();
const walk = (n) => { const self = n.selfSize; if (self) { const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber}`; agg.set(k, (agg.get(k) || 0) + self); } n.children.forEach(walk); };
walk(profile.head);
[...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log((v / 1048576).toFixed(1) + " MB", k));
await browser.close();
