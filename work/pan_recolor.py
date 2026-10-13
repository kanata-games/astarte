"""pan_recolor.py: raw/pan_attack.jpg -> raw/pan_attack_fix.png. In this raw the ears are navy and the hair grey;
per frame head zone: navy (blue, mid-dark) in the ear band -> white-ear greys; low-saturation greys -> lifted toward
the white hair of the scythe sheet. Outlines (v<60) and the black pan (v<110) are kept."""
import json, numpy as np; from PIL import Image
M = [f for f in json.load(open('frames_pan_measured.json')) if f['raw'] == 'pan_attack']
a = np.asarray(Image.open('raw/pan_attack.jpg').convert('RGB')).astype(np.float64); o = a.copy()
r, g, b = a[..., 0], a[..., 1], a[..., 2]; v = a.max(-1); s = v - a.min(-1)
grey = (s < 45) & (v > 110) & (g - np.maximum(r, b) < 25)
navy = (b > r + 20) & (b > g + 5) & (v > 55) & (v < 160) & (g - np.maximum(r, b) < 10)
H = 70
for f in M:
    x0, y0, x1, y1 = f['body']; fx = f['face_x']; t = f['top']
    hx0, hx1 = x0, x1   # whole body width (face_x is unreliable when a hand is raised)
    ear = np.zeros(v.shape, bool); ear[t - 2:t + 40, hx0:hx1] = True
    hair = np.zeros(v.shape, bool); hair[t - 2:t + int(H * 0.95), hx0:hx1] = True
    m = ear & navy; nv = 205 + (v[m] - 55) * 0.45; o[m] = np.stack([nv, nv, nv + 6], -1)
    m = hair & grey & ~(ear & navy); nv = 255 - (255 - v[m]) * 0.6
    o[m] = np.stack([nv, nv, np.minimum(255, nv + 4)], -1)
Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).save('raw/pan_attack_fix.png')
im = Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)); im.resize((960, 540)).save('tmp/v_fix.png')
