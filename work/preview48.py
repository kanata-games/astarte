"""preview48.py sheet.png meta.json out.png [scale] [cols] -> labelled contact sheet (cx magenta, feet line, 44px line yellow)"""
import sys, json; from PIL import Image, ImageDraw
sh = Image.open(sys.argv[1]).convert('RGBA'); mt = json.load(open(sys.argv[2])); S = int(sys.argv[4]) if len(sys.argv) > 4 else 6
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 10
fw, fh, cx, base = mt['fw'], mt['fh'], mt['cx'], mt['base']; n = sh.width // fw; rows = (n + cols - 1) // cols
im = Image.new('RGB', (cols * (fw * S + 6), rows * (fh * S + 18)), (40, 40, 48)); d = ImageDraw.Draw(im)
for i in range(n):
    c, r = i % cols, i // cols; x, y = c * (fw * S + 6), r * (fh * S + 18) + 14
    bg = Image.new('RGBA', (fw, fh), (150, 160, 170, 255)); bg.alpha_composite(sh.crop((i * fw, 0, i * fw + fw, fh)))
    im.paste(bg.resize((fw * S, fh * S), Image.NEAREST), (x, y))
    d.line([(x + cx * S + S // 2, y), (x + cx * S + S // 2, y + fh * S)], fill=(255, 0, 255))
    d.line([(x, y + base * S), (x + fw * S, y + base * S)], fill=(255, 0, 255)); d.line([(x, y + (base - 44) * S), (x + fw * S, y + (base - 44) * S)], fill=(255, 255, 0))
    d.text((x + 2, y - 13), f"{i} {mt['frames'][i]['name']}", fill=(255, 255, 255))
im.save(sys.argv[3])
