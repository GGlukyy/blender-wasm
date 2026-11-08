/* B3j: zstd rozbalení v samostatném workeru. zstddec drží svou wasm paměť (komprimovaný + rozbalený soubor, ~230 MB)
 * v modulové proměnné navždy; worker se po rozbalení ukončí (main.js), a tím se ta paměť uvolní. */
import { ZSTDDecoder } from "zstddec";
const decoder = new ZSTDDecoder();
self.onmessage = async (e) => {
  const { id, buf, size } = e.data;
  try {
    await decoder.init();
    const out = decoder.decode(new Uint8Array(buf), size);
    self.postMessage({ id, out }, [out.buffer]);
  } catch (err) { self.postMessage({ id, err: String(err) }); }
};
