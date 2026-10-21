#!/usr/bin/env python3
"""Consistency checks on the flag data and artwork. Run from the repo root; exits 1 on any finding.

- every flag has artwork, and no two flags share byte-identical artwork
- every true-proportion file has a TRUER ratio that matches its viewBox
- every VARIANTS entry has its file
"""
import hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# Pull the data out of the JS files with node, so this stays in step with what the app loads.
data = json.loads(subprocess.check_output(["node", "-e", """
const fs=require("fs"),vm=require("vm");
const ctx=vm.runInNewContext(fs.readFileSync("js/data/flags.js","utf8")+fs.readFileSync("js/data/names.js","utf8")+";({FLAGS,TRUER,VARIANTS,NOQUIZ:[...NOQUIZ]})");
process.stdout.write(JSON.stringify(ctx))"""]))

bad = []
def art(code):
    p = f"flags-true/{code}.svg"
    return p if os.path.exists(p) else f"flags/{code}.svg"

seen = {}
for f in data["FLAGS"]:
    p = art(f["c"])
    if not os.path.exists(p):
        bad.append(f"{f['c']}: no artwork"); continue
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h in seen and not ({f["c"], seen[h]} & set(data["NOQUIZ"])):  # a study-only flag may share artwork on purpose
        bad.append(f"{f['c']} and {seen[h]} have identical artwork ({p})")
    seen[h] = f["c"]
    if p.startswith("flags-true/"):
        vb = re.search(r'viewBox="([^"]+)"', open(p).read())
        if not vb:
            bad.append(f"{f['c']}: no viewBox"); continue
        x, y, w, hgt = map(float, vb.group(1).split())
        r = round(w / hgt, 4)
        t = data["TRUER"].get(f["c"])
        if t is None:
            bad.append(f"{f['c']}: no TRUER ratio (viewBox gives {r})")
        elif abs(t - r) > 0.01:
            bad.append(f"{f['c']}: TRUER {t} but viewBox gives {r}")

for code, vs in data["VARIANTS"].items():
    folder = os.path.dirname(art(code))
    for i, v in enumerate(vs):
        stem = code if i == 0 else f"{code}-{v['k']}"
        if not os.path.exists(f"{folder}/{stem}.svg"):
            bad.append(f"{code}: variant file {folder}/{stem}.svg missing")

for line in bad:
    print(line)
print(f"{len(data['FLAGS'])} flags checked, {len(bad)} findings")
sys.exit(1 if bad else 0)
