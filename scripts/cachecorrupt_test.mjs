// H52: poškozená (useknutá) kopie assets.tar.zst v Cache API → start ji pozná, smaže a stáhne znovu a Blender nastartuje.
const { chromium } = await import(process.env.PW || "playwright");
const os = await import("os"), fs = await import("fs"), path = await import("path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-"));
const ctx = await chromium.launchPersistentContext(dir, { headless: false, executablePath: process.env.CHROME, viewport: { width: 1400, height: 850 }, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = ctx.pages()[0] || await ctx.newPage();
const logs = []; page.on("console", m => { const t = m.text(); if (/bin cache|WGPU_FIRST_CONTENT/.test(t)) { logs.push(t); console.log(t.slice(0, 140)); } });
const q = "http://localhost:5173/?" + (process.env.Q || "");
const ready = async () => { await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find(x => /Launch Blender/.test(x.textContent)); return b && !b.disabled; }, null, { timeout: 240000 }).catch(() => {}); };
await page.goto(q, { waitUntil: "load" }); await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {}); await ready();
const info = await page.evaluate(async () => { const c = await caches.open("blender-bin-v1"); const r = await c.match("assets.tar.zst"); if (!r) return null;
  const b = new Uint8Array(await r.arrayBuffer()); const tok = r.headers.get("x-bin-token");
  await c.put("assets.tar.zst", new Response(b.slice(0, b.length >> 1), { headers: { "x-bin-token": tok } })); return { full: b.length, now: b.length >> 1 }; });
console.log("CC truncated", JSON.stringify(info));
await page.goto(q, { waitUntil: "load" }); await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {}); await ready();
const corruptSeen = logs.some(t => /bin cache corrupt/.test(t));
const size = await page.evaluate(async () => { const r = await (await caches.open("blender-bin-v1")).match("assets.tar.zst"); return r ? (await r.arrayBuffer()).byteLength : 0; });
await page.getByRole("button", { name: /Launch Blender/ }).click();
let up = false; for (let i = 0; i < 120 && !up; i++) { await new Promise(r => setTimeout(r, 1000)); up = logs.some(t => /WGPU_FIRST_CONTENT/.test(t)); }
const ok = !!info && corruptSeen && info.full === size && up;
console.log((ok ? "PASS" : "FAIL") + " cachecorrupt corrupt_seen=" + corruptSeen + " cache_restored=" + (info && info.full === size) + " blender_up=" + up);
await ctx.close(); process.exit(ok ? 0 : 1);
