"""make_spec.py [variant] -> spec_astarte.json for lib/gaiden_sheet.py. Edit per-raw K/KB, EXTRA (per-frame tweaks:
exclude/paint/dx/dy) here; a no-weapon / frying-pan variant = other raws + same frame list (or paint over the scythe)."""
import json, sys
M = json.load(open('frames_measured.json'))
HEAD = {'move': 66, 'attack': 64, 'misc': 61}            # raw ear-tip..chin
K = {'move': 1.0, 'attack': 66 / 64, 'misc': 66 / 61}      # head-size match -> move units
KB = {'move': 0.84, 'attack': 1.16, 'misc': 0.74}         # body (chin..feet) squash/stretch -> same proportions
NAMES = {'idle': ['idle'] * 4, 'run': ['run'] * 6, 'jump': ['jump_rise', 'jump_apex', 'fall', 'land'], 'roll': ['roll'] * 6,
         'light': ['light1'] * 2 + ['light2'] * 2 + ['light3'] * 3, 'heavy': ['heavy'] * 6, 'parry': ['parry'] * 3,
         'hurt': ['hurt'] * 2, 'death': ['death'] * 4, 'restpot': ['rest'] * 2 + ['potion'] * 4}
CHIN_RAW = {'heavy': 562, 'light': 326}
NOSQUASH = {('roll', 1), ('roll', 2), ('roll', 3), ('death', 2), ('death', 3)}
EXTRA = json.load(open('extra.json')) if __import__('os').path.exists('extra.json') else {}
frames = []
for f in M:
    raw, a, i = f['raw'], f['anim'], f['i']; k = K[raw]
    ax = round((f['face_x'] + f['feet_x']) / 2, 1); ay = f['bottom']
    chin = max(f['chin'] or 0, f['top'] + HEAD[raw] * 0.9)
    chin = CHIN_RAW.get(a, chin)   # rows where the auto chin hits the raised hands / scythe
    chin = None if (a, i) in NOSQUASH else round(ay - (ay - chin) * k, 1)   # chin after the k scale about the feet
    nm = NAMES[a][i]; key = f'{nm}_{i}'
    L = {'src': raw, 'box': f['box'], 'k': k, 'pivot': [ax, ay]}
    L.update(EXTRA.get(key, {}).get('layer', {}))
    fr = {'name': nm, 'anchor': [ax, ay], 'chin': chin, 'kb': KB[raw], 'layers': [L]}
    fr.update(EXTRA.get(key, {}).get('frame', {}))
    frames.append(fr)
spec = {'fw': 96, 'fh': 80, 'cx': 44, 'base': 78, 'scale': 0.385, 'colors': 31, 'median': 3, 'erode': 1,
        'raws': {r: f'raw/raw_{r}.jpg' for r in K}, 'frames': frames}
json.dump(spec, open('spec_astarte.json', 'w'), indent=1); print(len(frames), 'frames')
