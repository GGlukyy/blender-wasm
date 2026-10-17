import json, sys, collections
ev = json.load(open(sys.argv[1]))
ev = ev["traceEvents"] if isinstance(ev, dict) else ev
nodes = {}   # (pid,tid,profile id) -> {id: node}
samples = collections.defaultdict(list)
deltas = collections.defaultdict(list)
for e in ev:
    if e.get("name") == "ProfileChunk":
        a = e["args"]["data"]; key = (e["pid"], e["tid"], e["id"])
        cp = a.get("cpuProfile", {})
        for n in cp.get("nodes", []): nodes.setdefault(key, {})[n["id"]] = n
        samples[key] += cp.get("samples", []); deltas[key] += a.get("timeDeltas", [])
tot = {}
for key in samples:
    nm = nodes.get(key, {}); t = collections.Counter()
    for s, d in zip(samples[key], deltas[key]):
        n = nm.get(s); 
        if n: t[n["callFrame"]["functionName"] or "(anon)"] += d
    tot[key] = t
best = sorted(tot.items(), key=lambda kv: -sum(kv[1].values()))
for key, t in best[:3]:
    total = sum(t.values())
    print(f"== thread {key[:2]} total {total/1000:.0f} ms")
    for name, us in t.most_common(35):
        print(f"{us/1000:8.1f} ms {100*us/total:5.1f}%  {name}")
