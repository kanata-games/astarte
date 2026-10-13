"""make_spec_pan.py -> spec_pan.json (frying-pan variant, same 96x80 / cx 44 / feet 78 / scale 0.385 as spec_astarte.json).
Per-raw K (head match) / KB (body length) calibrated to the scythe sheet's move units (head 65, body 95 raw-move px).
roll = the scythe sheet's roll frames (raw_attack.jpg, no weapon) + a painted pan disc. pan_attack uses the recoloured
raw/pan_attack_fix.png (pan_recolor.py). Per-frame tweaks: extra_pan.json (same format as extra.json)."""
import json, math, os
M = json.load(open('frames_pan_measured.json')); SC = json.load(open('spec_astarte.json'))
HEAD = {'pan_move': 73, 'pan_attack': 70, 'pan_misc': 68}   # raw ear-tip..chin (skin-cluster chin, same method as measure.py)
BODY = {'pan_move': 105, 'pan_attack': 85, 'pan_misc': 95}  # chin..feet on a standing frame
K = {r: 65 / HEAD[r] for r in HEAD}; KB = {r: 95 / (BODY[r] * K[r]) for r in HEAD}
SRC = {'pan_move': 'raw/pan_move.jpg', 'pan_attack': 'raw/pan_attack_fix.png', 'pan_misc': 'raw/pan_misc.jpg', 'attack': 'raw/raw_attack.jpg'}
NAMES = {'idle': ['idle'] * 4, 'run': ['run'] * 6, 'jump': ['jump_rise', 'jump_apex', 'fall', 'land'],
         'light': ['light1', 'light2', 'light3', 'light3', 'light3', 'light1', 'light2'], 'heavy': ['heavy'] * 6, 'parry': ['parry'] * 4,
         'hurtdeath': ['hurt'] * 2 + ['death'] * 4, 'restpot': ['rest'] * 2 + ['potion'] * 4}
NOSQUASH = {('hurtdeath', 4), ('hurtdeath', 5)}
EXTRA = json.load(open('extra_pan.json')) if os.path.exists('extra_pan.json') else {}
PAN = json.load(open('roll_pan.json'))   # per roll frame: [px, py, angle_deg] raw coords of the painted pan centre
def pan_paint(px, py, ang, R=15):
    c = lambda rr, n=20: [[round(px + rr * math.cos(2 * math.pi * j / n), 1), round(py + rr * 0.8 * math.sin(2 * math.pi * j / n), 1)] for j in range(n)]
    hx, hy = px + math.cos(math.radians(ang)) * (R + 16), py + math.sin(math.radians(ang)) * (R + 16)
    return [{'line': [[px, py], [hx, hy]], 'w': 9, 'rgb': [18, 16, 22]}, {'line': [[px, py], [hx, hy]], 'w': 5, 'rgb': [92, 64, 44]},
            {'poly': c(R + 3), 'rgb': [18, 16, 22]}, {'poly': c(R), 'rgb': [70, 72, 80]}, {'poly': c(R - 4), 'rgb': [40, 40, 46]}]
frames = []
def add(f, raw):
    a, i = f['anim'], f['i']; k = K[raw]; ax = round((f['face_x'] + f['feet_x']) / 2, 1); ay = f['bottom']
    chin = max(f['chin'] or 0, f['top'] + HEAD[raw] * 0.9)
    chin = None if (a, i) in NOSQUASH else round(ay - (ay - chin) * k, 1)
    nm = NAMES[a][i]; key = f'{nm}_{i}'
    L = {'src': raw, 'box': f['box'], 'k': k, 'pivot': [ax, ay], 'keep_all': True}
    L.update(EXTRA.get(key, {}).get('layer', {}))
    fr = {'name': nm, 'anchor': [ax, ay], 'chin': chin, 'kb': KB[raw], 'layers': [L]}; fr.update(EXTRA.get(key, {}).get('frame', {}))
    frames.append(fr)
by = lambda raw, a: [f for f in M if f['raw'] == raw and f['anim'] == a]
for a in ('idle', 'run', 'jump'): [add(f, 'pan_move') for f in by('pan_move', a)]
for j, fr in enumerate([f for f in SC['frames'] if f['name'] == 'roll']):
    fr = json.loads(json.dumps(fr)); fr['layers'][0]['paint'] = fr['layers'][0].get('paint', []) + pan_paint(*PAN[j]); frames.append(fr)
LIGHT_ORDER = [0, 5, 1, 6, 2, 3, 4]   # light1 = bonk+recover, light2 = bonk+recover, light3 = hop, slam, impact
_l = by('pan_attack', 'light'); [add(_l[j], 'pan_attack') for j in LIGHT_ORDER]
for a in ('heavy', 'parry'): [add(f, 'pan_attack') for f in by('pan_attack', a)]
for a in ('hurtdeath', 'restpot'): [add(f, 'pan_misc') for f in by('pan_misc', a)]
spec = {k_: SC[k_] for k_ in ('fw', 'fh', 'cx', 'base', 'scale', 'colors', 'median', 'erode')}
spec.update(groups=[['pink_ear', 3]], raws=SRC, frames=frames); json.dump(spec, open('spec_pan.json', 'w'), indent=1)
print(len(frames), 'frames', {r: (round(K[r], 3), round(KB[r], 3)) for r in K})
