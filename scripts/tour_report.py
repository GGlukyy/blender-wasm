#!/usr/bin/env python3
"""B2: tabulka prohlídky krok × zařízení. tour_report.py out/ipad/tel_<datum>.jsonl [další soubory]
Buňka: OK / CHYBA: první řádek / GPU: první chyba / BEZ OBRAZU. Screenshoty do out/tour/<relace>/."""
import base64, json, os, re, sys

runs = {}
for path in sys.argv[1:]:
    for line in open(path, encoding="utf8", errors="replace"):
        if '"tour_' not in line and '"abort"' not in line and '"lost"' not in line:
            continue
        try:
            o = json.loads(line)
        except ValueError:
            continue
        sid, k = o.get("sid"), o.get("kind")
        if k == "tour_start":
            ua, touch = o.get("ua", ""), o.get("touch", 0)
            dev = "Chrome" if "Chrome" in ua else ("iPad Safari" if touch > 1 else "Mac Safari")
            if "webkit_sim=1" in o.get("q", ""):
                dev += " sim"
            if "ipad=1" in o.get("q", ""):
                dev += " ipad=1"
            runs[sid] = {"dev": dev, "steps": {}, "end": None, "fatal": ""}
        elif sid in runs:
            r = runs[sid]
            if k == "tour_step":
                r["steps"][o["name"]] = o
                if o.get("shot"):
                    d = os.path.join("out", "tour", sid)
                    os.makedirs(d, exist_ok=True)
                    name = re.sub(r"\W", "_", o["name"])
                    with open(os.path.join(d, "%03d_%s.jpg" % (o["i"], name)), "wb") as f:
                        f.write(base64.b64decode(o["shot"].split(",", 1)[1]))
            elif k == "tour_end":
                r["end"] = o
            elif k in ("abort", "lost"):
                r["fatal"] = "%s: %s" % (k, str(o.get("msg") or o.get("reason") or "")[:80])

if not runs:
    sys.exit("Žádná prohlídka v telemetrii (kind tour_start).")


def cell(s):
    if s is None:
        return "-"
    if not s.get("ok"):
        return "CHYBA: " + s.get("err", "").split("\n")[0][:70]
    if s.get("nerr"):
        return "GPU (%d): %s" % (s["nerr"], (s.get("gpuerrs") or [""])[0][:70])
    if s.get("blank"):
        return "BEZ OBRAZU (std %s)" % s.get("std")
    return "OK"


ids = list(runs)
names = []
for sid in ids:
    for n in runs[sid]["steps"]:
        if n not in names:
            names.append(n)
print("| krok | " + " | ".join("%s `%s`" % (runs[s]["dev"], s) for s in ids) + " |")
print("|---|" + "---|" * len(ids))
for n in names:
    print("| %s | %s |" % (n, " | ".join(cell(runs[s]["steps"].get(n)) for s in ids)))
print()
for s in ids:
    r = runs[s]
    bad = [x for x in r["steps"].values() if cell(x) != "OK"]
    end = "doběhla za %s s" % r["end"]["s"] if r["end"] else "NEDOBĚHLA (poslední krok: %s)" % (list(r["steps"])[-1] if r["steps"] else "žádný")
    print("%s `%s`: %d kroků, %d s problémem, %s%s" % (r["dev"], s, len(r["steps"]), len(bad), end, ("; " + r["fatal"]) if r["fatal"] else ""))
