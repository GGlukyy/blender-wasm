#!/usr/bin/env python3
"""Čeká na živý test z iPadu (telemetrie ?tel=1 -> out/ipad/tel_*.jsonl) a vypíše výsledek.
Použití:  python3 scripts/ipad_wait.py [--max-sec 540] [--quiet-sec 25] [--freeze-ms 8000]
Konec čekání, když nová relace (od spuštění skriptu): (a) má abort/error/lost, (b) rt_phase_ms > freeze-ms
(vlákno visí), nebo (c) nepřišel žádný řádek quiet-sec (stránka zavřena/zabita). Exit: 0 = něco se stalo, 2 = timeout bez relace.
Čte jen přírůstek souboru => levné, Claude nemusí dělat desítky tahů."""
import argparse, glob, json, os, time
ap = argparse.ArgumentParser()
ap.add_argument("--max-sec", type=int, default=540); ap.add_argument("--quiet-sec", type=int, default=25)
ap.add_argument("--freeze-ms", type=int, default=8000); ap.add_argument("--dir", default="out/ipad")
a = ap.parse_args()
start = time.time(); sess = {}  # sid -> dict
def files(): return sorted(glob.glob(os.path.join(a.dir, "tel_*.jsonl")))
pos = {f: os.path.getsize(f) for f in files()}  # ignoruj starou historii
def summary():
    for sid, d in sess.items():
        print(f"== {sid} url={d['url']} trvání={d['last_t']/1000:.0f}s řádků={d['n']}")
        for e in d["events"][-6:]: print("   !", e)
        print("   poslední stav:", d["last"])
        if d.get("auto"): print("   auto:", " | ".join(d["auto"][-12:]), "=> HOTOVO" if d.get("auto_done") else "=> NEDOKONČENO")
while time.time() - start < a.max_sec:
    for f in files():
        pos.setdefault(f, 0)
        with open(f, "rb") as fh:
            fh.seek(pos[f]); chunk = fh.read(); pos[f] += len(chunk)
        for line in chunk.decode("utf-8", "ignore").splitlines():
            try: r = json.loads(line)
            except Exception: continue
            sid = r.get("sid")
            if not sid: continue
            d = sess.setdefault(sid, dict(url="", n=0, last_t=0, events=[], last="", seen=time.time(), hang=False))
            d["n"] += 1; d["seen"] = time.time(); d["last_t"] = r.get("t", d["last_t"]) or d["last_t"]
            k = r.get("kind")
            if k == "start": d["url"] = r.get("url", "")
            if k in ("abort", "error", "rejection", "lost", "lost_detail", "pagehide"):
                d["events"].append(f"t={r.get('t')} {k} {str(r.get('what') or r.get('msg') or r.get('reason'))[:160]} | {str(r.get('stack',''))[:300]}")
            if k in ("auto_step", "auto_done"): d["auto"] = d.get("auto", []) + [f"{r.get('t')}ms {k} {r.get('name')}"]
            if k == "auto_done": d["auto_done"] = True
            if k == "sample":
                d["last"] = f"fps={r.get('fps')} rt_phase={r.get('rt_phase')} rt_phase_ms={r.get('rt_phase_ms')} rt_frame={r.get('rt_frame')} tex_mb={(r.get('gpu') or {}).get('tex_mb')} heap={r.get('heap_mb')}"
                if (r.get("rt_phase_ms") or 0) > a.freeze_ms: d["hang"] = True
    done = [d for d in sess.values() if any(" abort " in e or " lost" in e or " error " in e for e in d["events"]) or d["hang"] or time.time() - d["seen"] > a.quiet_sec]
    if any(d.get("auto_done") for d in sess.values()) and all(d["n"] > 3 for d in sess.values() if d.get("auto_done")) and not done:
        time.sleep(4); print("VÝSLEDEK iPad testu (auto_done):"); summary(); raise SystemExit(0)
    if sess and done and all(d["n"] > 3 for d in done):
        print("VÝSLEDEK iPad testu:"); summary(); raise SystemExit(0)
    time.sleep(2)
print("TIMEOUT: z iPadu nic nepřišlo (běží dev server + tunel? Lukáš otevřel ?mp=1&tel=1?)"); raise SystemExit(2)
