// Windows Chrome: Blender BEZ ?mcp=, add-on "Blender Web MCP" se zapne a Connect přes operátor (jako tlačítko v Preferences).
// node mcp_addon_page.mjs <port> <token> [sec]
const { chromium } = await import(process.env.PW || "playwright");
const [port, token, sec] = [process.argv[2], process.argv[3], parseInt(process.argv[4] || "150", 10)];
const expr = `import bpy, addon_utils, sys
st = {'n': 0}
def go():
    st['n'] += 1
    try:
        addon_utils.modules_refresh()
        mods = [m.__name__ for m in addon_utils.modules()]
        print('MCPADDON listed', 'blender_web_mcp' in mods, 'enabled_by_default', 'blender_web_mcp' in bpy.context.preferences.addons)
        bpy.ops.preferences.addon_enable(module='blender_web_mcp')
        p = bpy.context.preferences.addons['blender_web_mcp'].preferences
        p.url = 'ws://127.0.0.1:${port}'; p.token = '${token}'
        print('MCPADDON connect', bpy.ops.webmcp.connect())
    except Exception as e: print('MCPADDON ERR', repr(e))
    sys.stdout.flush()
    return None
bpy.app.timers.register(go, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("console", (m) => { if (/MCP/.test(m.text())) console.log(m.text().slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto(`http://localhost:5173/?mp=0`, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
await new Promise((r) => setTimeout(r, sec * 1000));
await browser.close();
