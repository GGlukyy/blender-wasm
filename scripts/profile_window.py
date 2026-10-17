import json, sys, collections
ev = json.load(open(sys.argv[1])); ev = ev["traceEvents"] if isinstance(ev, dict) else ev
nodes = {}; samples = collections.defaultdict(list); deltas = collections.defaultdict(list); start = {}
for e in ev:
    if e.get("name") in ("Profile", "ProfileChunk"):
        key = (e["pid"], e["tid"], e["id"])
        if e["name"] == "Profile": start[key] = e["args"]["data"].get("startTime", 0)
        else:
            a = e["args"]["data"]; cp = a.get("cpuProfile", {})
            for n in cp.get("nodes", []): nodes.setdefault(key, {})[n["id"]] = n
            samples[key] += cp.get("samples", []); deltas[key] += a.get("timeDeltas", [])
IDLE = ("_do_futex_wait", "(idle)", "(program)", "(garbage collector)")
# Blender thread = the one with the most busy time
best = None
for key in samples:
    busy = sum(d for s, d in zip(samples[key], deltas[key]) if nodes[key].get(s) and nodes[key][s]["callFrame"]["functionName"] not in IDLE)
    if best is None or busy > best[0]: best = (busy, key)
key = best[1]; nm = nodes[key]
t = start.get(key, 0); series = []
for s, d in zip(samples[key], deltas[key]):
    t += d; n = nm.get(s); ok = n and n["callFrame"]["functionName"] not in IDLE
    series.append((t, d, n["callFrame"]["functionName"] if ok else None))
# 100ms buckets
b = collections.Counter()
for t, d, f in series:
    if f: b[int(t // 100000)] += d
buckets = sorted(b)
# window: the last run of buckets with >=60ms busy per 100ms
hot = [k for k in buckets if b[k] >= 60000]
w0 = hot[-1]; 
while w0 - 1 in hot: w0 -= 1
w1 = hot[-1]
print(f"hot window {(w1-w0+1)*0.1:.1f}s (buckets {w0}..{w1})")
c = collections.Counter(); tot = 0
for t, d, f in series:
    if f and w0 <= int(t // 100000) <= w1: c[f] += d; tot += d
print(f"busy in window {tot/1000:.0f} ms")
for name, us in c.most_common(int(sys.argv[2]) if len(sys.argv) > 2 else 45): print(f"{us/1000:8.1f} ms {100*us/tot:5.1f}%  {name[:120]}")
