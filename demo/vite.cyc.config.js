/* C1 test server: publicDir = out/pubcyc (build with WITH_CYCLES=ON linked by `OUT=$PWD/out/pubcyc bash scripts/.link53.sh`), port 5173. */
import base from "./vite.config.js";
import { mergeConfig } from "vite";
export default mergeConfig(base, { publicDir: "../out/pubcyc", server: { port: 5173, strictPort: true } });
