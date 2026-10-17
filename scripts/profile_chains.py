import json, sys, collections
ev = json.load(open(sys.argv[1])); ev = ev["traceEvents"] if isinstance(ev, dict) else ev
target = sys.argv[2] if len(sys.argv) > 2 else "_do_futex_wait"
nodes = {}; samples = collections.defaultdict(list); deltas = collections.defaultdict(list)
for e in ev:
    if e.get("name") == "ProfileChunk":
        a = e["args"]["data"]; key = (e["pid"], e["tid"], e["id"]); cp = a.get("cpuProfile", {})
        for n in cp.get("nodes", []): nodes.setdefault(key, {})[n["id"]] = n
        samples[key] += cp.get("samples", []); deltas[key] += a.get("timeDeltas", [])
for key in samples:
    nm = nodes[key]; parent = {}
    for nid, n in nm.items():
        for c in n.get("children", []): parent[c] = nid
        if "parent" in n: parent[nid] = n["parent"]
    chains = collections.Counter(); nblender = 0
    for s, d in zip(samples[key], deltas[key]):
        n = nm.get(s)
        if not n: continue
        if n["callFrame"]["functionName"] == target:
            ch = []; cur = s
            while cur in parent and len(ch) < 9:
                cur = parent[cur]; fn = nm[cur]["callFrame"]["functionName"] or "(anon)"; ch.append(fn[:70])
            chains[" < ".join(ch)] += d
        if "blender::" in n["callFrame"]["functionName"]: nblender += 1
    tot = sum(chains.values())
    if tot > 100000:
        print(f"== thread {key[:2]} wait total {tot/1000:.0f} ms, blender-frames samples={nblender}")
        for c, us in chains.most_common(6): print(f"{us/1000:8.1f} ms  {c}")
