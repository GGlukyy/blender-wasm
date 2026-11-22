#!/usr/bin/env python3
"""H50: tabulka paměti v čase pro poslední relaci v telemetrii. soak_report.py out/ipad/tel_<datum>.jsonl [sid]"""
import json, sys
rows = []
for l in open(sys.argv[1], encoding="utf8", errors="replace"):
    try: rows.append(json.loads(l))
    except ValueError: pass
sid = sys.argv[2] if len(sys.argv) > 2 else rows[-1]["sid"]
print("sid", sid)
last = -999
for r in rows:
    if r.get("sid") != sid or "acct_mb" not in r: continue
    t = r["t"] // 1000
    if t - last < 30: continue
    last = t
    print(f"{t:5d}s acct={r['acct_mb']} js={r.get('js_used_mb')} malloc={r.get('rt_malloc_mb')} frame={r.get('rt_frame')} phase={r.get('rt_phase')} texalloc={r.get('tex_alloc_mb')} freed={r.get('tex_freed_mb')} qd={r.get('q_depth')}")
