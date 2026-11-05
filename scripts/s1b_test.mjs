// S1b: dual-source obchvat podle WebKitu / chybějící featury, paměťová opatření jen na iPadu. node s1b_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const run = async (opt, stub) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, ...opt });
  const page = await ctx.newPage();
  if (stub) await page.addInitScript(() => {
    const r = GPU.prototype.requestAdapter;
    GPU.prototype.requestAdapter = async function (...a) {
      const ad = await r.apply(this, a);
      if (ad) Object.defineProperty(ad, "features", { value: new Set([...ad.features].filter((f) => f !== "dual-source-blending")) });
      return ad;
    };
  });
  let flags = null;
  page.on("console", (m) => { const i = m.text().indexOf("WEB_FLAGS "); if (i >= 0) flags = JSON.parse(m.text().slice(i + 10)); });
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 120 && !flags; i++) await new Promise((r) => setTimeout(r, 500));
  await ctx.close();
  return flags;
};
let fail = 0; const check = (n, f, want) => {
  const ok = f && Object.entries(want).every(([k, v]) => f[k] === v); if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${n} ${JSON.stringify(f)}`);
};
check("Mac Safari UA", await run({ userAgent: SAFARI }), { nodualsrc: "1", webkit: true, ipad_ua: false, mp_lite: "0", pool: 32, bp: "0" });
check("Chrome bez dual-source", await run({}, true), { nodualsrc: "1", webkit: false, ipad_ua: false, mp_lite: "0", pool: 32 });
check("Chrome s dual-source", await run({}), { webkit: false, ipad_ua: false, mp_lite: "0", pool: 32 });
await browser.close();
console.log(fail ? "FAIL: s1b " + fail : "PASS: s1b");
process.exit(fail ? 1 : 0);
