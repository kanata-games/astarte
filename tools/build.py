#!/usr/bin/env python3
"""Builds index.html (repo root, served by GitHub Pages) from src/ parts.

  python3 tools/build.py            # sprites load from assets/*.png (Pages)
  python3 tools/build.py --out X    # write somewhere else

assets/*.json (atlas rect maps + hero frame metadata) are inlined as EMBEDDED_META[<file stem>].
EDIT src/*, NEVER index.html directly - it is overwritten by this script.
"""
import glob, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = ['01_head.html'] + sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, 'src', '*.js')))  # v0.4: every src/*.js, in name order
OUT = os.path.join(ROOT, 'index.html')
if '--out' in sys.argv: OUT = os.path.abspath(sys.argv[sys.argv.index('--out') + 1])
meta = {}
for p in sorted(glob.glob(os.path.join(ROOT, 'assets', '*.json'))):
    meta[os.path.splitext(os.path.basename(p))[0]] = json.load(open(p, encoding='utf-8'))
embedded = '\n// ---- sprite metadata embedded at build time (tools/build.py) ----\nconst EMBEDDED_META = ' + json.dumps(meta, separators=(',', ':'), ensure_ascii=False) + ';\n'
out = []
for part in PARTS:
    src = open(os.path.join(ROOT, 'src', part), encoding='utf-8').read()
    if part == '03_core.js': out.append(embedded)
    out.append(src)
html = ''.join(out)
open(OUT, 'w', encoding='utf-8').write(html)
print('built %s (%d bytes, meta: %s)' % (os.path.relpath(OUT, ROOT), len(html.encode('utf-8')), ', '.join(meta)))
