#!/usr/bin/env python3
# Statická kontrola: RNA update funkce musí mít správný počet parametrů (kolo 66).
# PROP_CONTEXT_UPDATE -> (bContext*, PointerRNA*) = 2 parametry; jinak (Main*, Scene*, PointerRNA*) = 3.
# Na x86 to „nějak funguje“, na WebAssembly je to pád „function signature mismatch“ (indirect call).
import re, glob, sys, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'blender', 'source', 'blender', 'makesrna', 'intern')
bad = set()
for f in glob.glob(os.path.join(root, 'rna_*.cc')):
    s = open(f, errors='ignore').read()
    funcs = {}
    for m in re.finditer(r'\n(?:static\s+)?void\s+(rna_[A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{', s):
        funcs[m.group(1)] = len([p for p in m.group(2).split(',') if p.strip()])
    for m in re.finditer(r'prop = RNA_def_property\(.*?(?=\n\s*prop = RNA_def_property|\n}\n)', s, re.S):
        blk = m.group(0)
        u = re.search(r'RNA_def_property_update\(prop, [^,]+, "([^"]+)"\)', blk)
        if not u or u.group(1) not in funcs: continue
        want = 2 if 'PROP_CONTEXT_UPDATE' in blk else 3
        if funcs[u.group(1)] != want: bad.add((os.path.basename(f), u.group(1), want, funcs[u.group(1)]))
for b in sorted(bad): print('MISMATCH', *b)
print('OPS rna_update_signatures', 'PASS (0 nesrovnalostí)' if not bad else 'FAIL %d nesrovnalostí' % len(bad))
sys.exit(1 if bad else 0)
