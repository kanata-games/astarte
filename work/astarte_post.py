"""astarte_post.py build.png spec.json -> ../assets/art/astarte.png + astarte.json
1px black outer outline (4-neighbour, inside the frame), animation table, attack hitbox hints
(bbox of the pale-blue slash pixels; parry = bbox of everything in front of cx+8). Variants: pass other names via
OUT env (e.g. OUT=astarte_pan)."""
import sys, os, json, numpy as np; from PIL import Image; from scipy import ndimage
src, specp = sys.argv[1], sys.argv[2]; sp = json.load(open(specp)); FW, FH, CX, BASE = sp['fw'], sp['fh'], sp['cx'], sp['base']
name = os.environ.get('OUT', 'astarte'); outd = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'art')
a = np.array(Image.open(src).convert('RGBA')); N = a.shape[1] // FW; a0 = a.copy()   # a0 = before outline (hitbox source)
for i in range(N):
    f = a[:, i * FW:(i + 1) * FW]; op = f[..., 3] > 0; n = np.zeros_like(op)
    n[1:] |= op[:-1]; n[:-1] |= op[1:]; n[:, 1:] |= op[:, :-1]; n[:, :-1] |= op[:, 1:]
    o = n & ~op; f[o] = (0, 0, 0, 255)
    t = [s for s, v in (('T', f[0, :, 3]), ('B', f[-1, :, 3]), ('L', f[:, 0, 3]), ('R', f[:, -1, 3])) if v.any()]
    if t: print('EDGE', i, t)
Image.fromarray(a, 'RGBA').save(os.path.join(outd, name + '.png'))
names = [fr['name'] for fr in sp['frames']]
idx = {}; [idx.setdefault(n_, []).append(i) for i, n_ in enumerate(names)]
T = {'idle': (150, True), 'run': (80, True), 'jump_rise': (100, True), 'jump_apex': (120, False), 'fall': (100, True), 'land': (80, False),
     'roll': (60, False), 'light1': (70, False), 'light2': (70, False), 'light3': (80, False), 'heavy': ([240, 80, 90, 110, 110, 130], False),
     'parry': ([60, 160, 100], False), 'hurt': (100, False), 'death': ([120, 140, 180, 600], False), 'rest': ([250, 600], False), 'potion': ([140, 220, 220, 160], False)}
ACTIVE = {'light1': [1], 'light2': [1], 'light3': [0, 1], 'heavy': [1, 2], 'parry': [1]}   # index inside the animation
OV = json.load(open(os.environ['ANIMCFG'])) if os.environ.get('ANIMCFG') else {}   # variant overrides: timing / active / hitbox mode
for k_, v_ in OV.get('timing', {}).items(): T[k_] = (v_[0], v_[1])
ACTIVE.update(OV.get('active', {})); HBMODE = OV.get('hitbox', 'slash')
def hitbox(i, parry=False):
    f = a0[:, i * FW:(i + 1) * FW].astype(int); op = f[..., 3] > 0
    if parry: m = op.copy(); m[:, :CX + 8] = False
    elif HBMODE == 'pan':   # pan iron (dark, low saturation) + yellow impact sparks, in front of cx-8
        v = f[..., :3].max(-1); sat = v - f[..., :3].min(-1)
        dk = op & (v < 75) & (sat < 25); dk[:, :CX - 8] = False; lab, n = ndimage.label(ndimage.binary_closing(dk, iterations=1))
        m = (lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)) if n else dk   # biggest dark blob = the pan
        y_ = op & (f[..., 0] > 200) & (f[..., 1] > 170) & (f[..., 2] < 140); y_[:, :CX - 8] = False; m = m | y_
    else: m = op & (f[..., 2] > 180) & (f[..., 2] - f[..., 0] > 25); m[:, :CX - 8] = False
    ys, xs = np.nonzero(m)
    if len(xs) < 8: m = op.copy(); m[:, :CX + 8] = False; ys, xs = np.nonzero(m)
    return {'x': int(xs.min() - CX), 'y': int(ys.min() - BASE), 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1)}
anims = []
for an, (ms, loop) in T.items():
    fr = idx[an]; ms = ms if isinstance(ms, list) else [ms] * len(fr)
    e = {'name': an, 'frames': fr, 'ms': ms, 'loop': loop}
    if an in ACTIVE: e['active'] = [fr[j] for j in ACTIVE[an]]; e['hitbox'] = {str(fr[j]): hitbox(fr[j], an == 'parry') for j in ACTIVE[an]}
    anims.append(e)
J = {'image': name + '.png', 'frame_w': FW, 'frame_h': FH, 'frames': N, 'columns': N, 'cx': CX, 'feet_y': BASE, 'facing': 'right',
     'hitbox_note': ('pan variant: ' if HBMODE == 'pan' else '') + 'hitbox x/y relative to (cx, feet_y), facing right; mirror x for left. parry box = guard area.',
     'animations': anims}
json.dump(J, open(os.path.join(outd, name + '.json'), 'w'), indent=1, ensure_ascii=False)
cols = {tuple(c) for c in a[a[..., 3] > 0][:, :3]}; print('frames', N, 'colours', len(cols), 'alpha', sorted(set(a[..., 3].ravel())))
for e in anims: print(e['name'], len(e['frames']), e.get('hitbox', ''))
