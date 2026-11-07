// T1: okna testů mimo oči. Načítá node.cmd v p2win (viz pw_win_setup.sh) přes --import, platí tedy pro všechny testy bez úprav.
// Kam: PW_WIN_POS (env), jinak první řádek p2win/pw_win_pos.txt, jinak mimo obrazovku. "off" = staré chování.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

let pos = process.env.PW_WIN_POS;
if (!pos) { try { pos = readFileSync(new URL("./pw_win_pos.txt", import.meta.url), "utf8").split(/\r?\n/)[0].trim(); } catch (_) {} }
pos = pos || "-3000,0";
if (pos !== "off") {
  /* Skryté okno by Chrome jinak přestal kreslit a brzdil časovače. */
  const ADD = [`--window-position=${pos}`, "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-features=CalculateNativeWinOcclusion"];
  const launch = chromium.launch.bind(chromium), persistent = chromium.launchPersistentContext.bind(chromium);
  const opts = (o = {}) => o.headless === false ? { ...o, args: [...(o.args || []), ...ADD] } : o;
  chromium.launch = (o) => launch(opts(o));
  chromium.launchPersistentContext = (dir, o) => persistent(dir, opts(o));
}
