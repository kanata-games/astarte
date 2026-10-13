"""preview.py sheet.png spec.json out.png [scale] -> labelled contact sheet (grey bg, cx / feet lines)"""
import sys, json; from PIL import Image, ImageDraw
sh = Image.open(sys.argv[1]).convert('RGBA'); sp = json.load(open(sys.argv[2])); S = int(sys.argv[4]) if len(sys.argv) > 4 else 4
fw, fh = sp['fw'], sp['fh']; n = sh.width // fw; cols = 8; rows = (n + cols - 1) // cols
im = Image.new('RGB', (cols * (fw * S + 6), rows * (fh * S + 18)), (40, 40, 48)); d = ImageDraw.Draw(im)
for i in range(n):
    c, r = i % cols, i // cols; x, y = c * (fw * S + 6), r * (fh * S + 18) + 14
    bg = Image.new('RGBA', (fw, fh), (120, 130, 140, 255)); bg.alpha_composite(sh.crop((i * fw, 0, i * fw + fw, fh)))
    im.paste(bg.resize((fw * S, fh * S), Image.NEAREST), (x, y))
    d.line([(x + sp['cx'] * S, y), (x + sp['cx'] * S, y + fh * S)], fill=(255, 0, 255)); d.line([(x, y + (sp['base'] + 1) * S), (x + fw * S, y + (sp['base'] + 1) * S)], fill=(255, 0, 255))
    d.line([(x, y + (sp['base'] + 1 - 64) * S), (x + fw * S, y + (sp['base'] + 1 - 64) * S)], fill=(255, 255, 0))
    d.text((x + 2, y - 13), f"{i} {sp['frames'][i]['name']}", fill=(255, 255, 255))
im.save(sys.argv[3])
