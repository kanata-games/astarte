"""shared preview helpers (2026-10-12; same look as make_diceroll_preview.py): strip / row / stack / mark / overlay / on_light"""
from PIL import Image, ImageDraw
import numpy as np
BG = (34, 34, 44, 255); BGL = (205, 205, 215, 255)
def strip(path, fw, fh, z, labels=None, cx=None, pad=6, bg=BG):
    im = Image.open(path).convert('RGBA') if isinstance(path, str) else path; n = im.width // fw
    W = n * (fw * z + pad) + pad; c = Image.new('RGBA', (W, fh * z + 22), bg); d = ImageDraw.Draw(c)
    for i in range(n):
        x = pad + i * (fw * z + pad); d.rectangle([x - 1, 1, x + fw * z, fh * z + 2], outline=(80, 80, 100))
        c.alpha_composite(im.crop((i * fw, 0, (i + 1) * fw, fh)).resize((fw * z, fh * z), Image.NEAREST), (x, 2))
        if cx is not None: d.line([x + cx * z + z // 2, 2, x + cx * z + z // 2, fh * z + 1], fill=(0, 200, 255, 90))
        d.text((x + 2, fh * z + 6), f'{i} {labels[i]}' if labels else str(i), fill=(255, 255, 255))
    return c
def mark(img, fw, z, i, x, y, label, col=(255, 255, 0), pad=6, ldy=-14):
    d = ImageDraw.Draw(img); X = pad + i * (fw * z + pad) + x * z + z // 2; Y = 2 + y * z + z // 2
    d.ellipse([X - 5, Y - 5, X + 5, Y + 5], outline=col); d.line([X - 2, Y, X + 2, Y], fill=col); d.line([X, Y - 2, X, Y + 2], fill=col)
    d.text((X + 7, Y + ldy), label, fill=col)
def row(parts, pad=16, bg=BG):
    W = sum(p.width for p in parts) + pad * (len(parts) - 1); H = max(p.height for p in parts)
    c = Image.new('RGBA', (W, H), bg); x = 0
    for p in parts: c.alpha_composite(p, (x, H - p.height)); x += p.width + pad
    return c
def stack(parts, title, out, captions=None):
    W = max(p.width for p in parts) + 12; H = sum(p.height + 34 for p in parts) + 24
    c = Image.new('RGBA', (W, H), BG); d = ImageDraw.Draw(c); d.text((6, 6), title, fill=(255, 230, 120)); y = 24
    for k, p in enumerate(parts):
        if captions: d.text((6, y), captions[k], fill=(170, 220, 255))
        c.alpha_composite(p, (6, y + 16)); y += p.height + 34
    c.save(out); return c
def overlay(path, fw, cx, z, frames, fh=None):
    fh = fh or fw
    im = np.asarray(Image.open(path).convert('RGBA')).astype(float); acc = np.zeros((fh, fw, 3)); cnt = np.zeros((fh, fw))
    for i in frames:
        q = im[:, i * fw:(i + 1) * fw]; a = q[..., 3] > 0; acc[a] += q[..., :3][a]; cnt[a] += 1
    o = np.zeros((fh, fw, 4), np.uint8); m = cnt > 0; o[m, :3] = (acc[m] / cnt[m][:, None]).astype(np.uint8); o[m, 3] = (60 + 195 * cnt[m] / len(frames)).astype(np.uint8)
    c = Image.new('RGBA', (fw * z, fh * z), BG); c.alpha_composite(Image.fromarray(o).resize((fw * z, fh * z), Image.NEAREST))
    dd = ImageDraw.Draw(c); dd.line([cx * z + z // 2, 0, cx * z + z // 2, fh * z], fill=(0, 220, 255)); return c
def on_light(path, fw, fh, z):
    im = Image.open(path).convert('RGBA'); c = Image.new('RGBA', (im.width * z, fh * z), BGL)
    c.alpha_composite(im.resize((im.width * z, fh * z), Image.NEAREST)); return c
