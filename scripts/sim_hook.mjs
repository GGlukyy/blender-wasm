// A2: přidá dotaz SIM_Q do každé adresy dev serveru, aniž by se měnily testy. Načte ho NODE_OPTIONS (viz regress_sim.sh).
import { chromium } from "playwright-core";
const q = process.env.SIM_Q || "webkit_sim=1";
const addQ = (u) => /localhost:5173/.test(u) && !u.includes(q) ? u + (u.includes("?") ? "&" : "?") + q : u;
const wrapPage = (p) => { const g = p.goto.bind(p); p.goto = (u, o) => g(addQ(u), o); return p; };
const wrapCtx = (c) => { const n = c.newPage.bind(c); c.newPage = async (...a) => wrapPage(await n(...a)); return c; };
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => { const b = await launch(...a);
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...x) => wrapCtx(await nc(...x)); b.newPage = async (...x) => wrapPage(await np(...x)); return b; };
const lp = chromium.launchPersistentContext.bind(chromium);
chromium.launchPersistentContext = async (...a) => wrapCtx(await lp(...a));
