/* 5.3 test server (nic nepřepisuje v demo/public):
 *   mkdir out/pub53; symlink demo/public/* tam; blender.js/blender.wasm.zst/assets.tar.zst/manifest.json nahradit soubory z
 *   `OUT=$PWD/out/link53z bash scripts/.link53.sh` (cd demo && npx vite --config vite.53.config.js), testy pak s localhost:5174 místo :5173. */
import base from "./vite.config.js";
import { mergeConfig } from "vite";
/* Dev server for the 5.3 build: same config, public dir = out/pub53 (symlinks + 5.3 blender.* files), port 5174. */
export default mergeConfig(base, { publicDir: "../out/pub53", server: { port: 5174, strictPort: true } });
