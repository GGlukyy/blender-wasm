/* C1 test server (iPad blender.* + PC blender-pc.*): publicDir = out/pubboth (build with WITH_CYCLES=ON linked by `OUT=$PWD/out/pubcyc bash scripts/.link53.sh`), port 5173. */
import base from "./vite.config.js";
import { mergeConfig } from "vite";
export default mergeConfig(base, { publicDir: "../out/pubboth", server: { port: 5173, strictPort: true } });
