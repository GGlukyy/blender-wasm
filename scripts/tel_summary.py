#!/usr/bin/env python3
"""Shrnutí telemetrie z iPadu: python3 -I scripts/tel_summary.py [out/ipad/tel_*.jsonl] [--all] (bez --all jen UA s iPad/iPhone/Macintosh Safari)."""
import json, sys, glob, collections
args = [a for a in sys.argv[1:] if not a.startswith("--")]
files = args or sorted(glob.glob("out/ipad/tel_*.jsonl"))
allua = "--all" in sys.argv
ses = collections.OrderedDict()
for f in files:
    for line in open(f):
        try: o = json.loads(line)
        except ValueError: continue
        ua = o.get("ua", "")
        if not allua and "Chrome" in ua and "Windows" in ua: continue
        s = ses.setdefault(o.get("sid"), {"ua": ua[:60], "n": 0, "max_buf": 0, "max_heap": 0, "last": None, "ev": []})
        if o.get("kind") == "sample":
            s["n"] += 1; s["last"] = o
            g = o.get("gpu") or {}
            s["max_buf"] = max(s["max_buf"], g.get("buf", 0)); s["max_heap"] = max(s["max_heap"], o.get("heap_mb", 0))
        elif o.get("kind") in ("lost", "lost_detail", "error", "rejection", "start_hang", "pagehide", "adapter"):
            s["ev"].append((o["kind"], o.get("t"), str(o.get("msg") or o.get("reason") or "")[:100]))
if not ses: print("žádná data z iPadu (použij --all pro i PC)")
for sid, s in ses.items():
    l = s["last"] or {}
    print(f"== {sid} {s['ua']} vzorků={s['n']} t_poslední={l.get('t')} ms max_buf={s['max_buf']} max_heap={s['max_heap']} MB fps={l.get('fps')} gpu={l.get('gpu')}")
    for e in s["ev"][-8:]: print("   ", e)
    if l: print("    poslední vstupy:", l.get("inputs", [])[-4:])
