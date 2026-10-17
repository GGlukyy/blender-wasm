import json, sys, collections
ev = json.load(open(sys.argv[1])); ev = ev["traceEvents"] if isinstance(ev, dict) else ev
nodes = {}; samples = collections.defaultdict(list); deltas = collections.defaultdict(list)
for e in ev:
    if e.get("name") == "ProfileChunk":
        a = e["args"]["data"]; key = (e["pid"], e["tid"], e["id"]); cp = a.get("cpuProfile", {})
        for n in cp.get("nodes", []): nodes.setdefault(key, {})[n["id"]] = n
        samples[key] += cp.get("samples", []); deltas[key] += a.get("timeDeltas", [])
IDLE = ("_do_futex_wait", "(idle)", "(program)", "(garbage collector)")
rows = []
for key in samples:
    nm = nodes[key]; t = collections.Counter()
    for s, d in zip(samples[key], deltas[key]):
        n = nm.get(s)
        if n and n["callFrame"]["functionName"] not in IDLE: t[n["callFrame"]["functionName"] or "(anon)"] += d
    rows.append((sum(t.values()), key, t))
rows.sort(key=lambda r: -r[0])
for busy, key, t in rows[:2]:
    print(f"== thread {key[:2]} busy {busy/1000:.0f} ms")
    for name, us in t.most_common(int(sys.argv[2]) if len(sys.argv) > 2 else 40): print(f"{us/1000:8.1f} ms {100*us/busy:5.1f}%  {name[:110]}")
