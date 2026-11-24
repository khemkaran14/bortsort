"""
Draws the Nutwise app icon, adaptive-icon layers and splash screens (Pillow).

    python3 tools/brand/make-icons.py      # writes apps/mobile/assets/*.png
    npx @capacitor/assets generate --android --ios   (run inside apps/mobile)
"""
import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 4096
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'mobile', 'assets')


def diag_mask(size, flip=False):
    """0 at top-left → 255 at bottom-right."""
    v = Image.linear_gradient('L').resize((size, size))
    h = v.rotate(90 if flip else -90)
    return Image.blend(v, h, 0.5)


def grad_bg(size, c1, c2):
    return Image.composite(Image.new('RGB', (size, size), c2), Image.new('RGB', (size, size), c1), diag_mask(size))


def nut_layer(size, scale=1.0):
    L = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cx = cy = size / 2
    R = size * 0.36 * scale
    pts = [(cx + R * math.cos(math.radians(60 * k + 30)), cy + R * math.sin(math.radians(60 * k + 30))) for k in range(6)]
    shadow = Image.new('L', (size, size), 0)
    ImageDraw.Draw(shadow).polygon([(x + size * 0.015, y + size * 0.03) for x, y in pts], fill=150)
    L.paste((10, 5, 30, 255), (0, 0), shadow.filter(ImageFilter.GaussianBlur(size * 0.025)))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    gold = Image.composite(
        Image.new('RGB', (size, size), (176, 104, 10)),
        Image.new('RGB', (size, size), (255, 226, 120)),
        Image.linear_gradient('L').resize((size, size)),
    )
    L.paste(gold, (0, 0), mask)
    d = ImageDraw.Draw(L)
    inner = Image.new('L', (size, size), 0)
    ImageDraw.Draw(inner).polygon([(cx + (x - cx) * 0.84, cy + (y - cy) * 0.84) for x, y in pts], fill=255)
    ring = ImageChops.subtract(mask, inner)
    tl = diag_mask(size)
    L.paste((255, 247, 200, 255), (0, 0), ImageChops.multiply(ring, ImageChops.invert(tl)).point(lambda v: int(v * 0.85)))
    L.paste((120, 62, 0, 255), (0, 0), ImageChops.multiply(ring, tl).point(lambda v: int(v * 0.75)))
    hr = R * 0.42
    d.ellipse((cx - hr * 1.12, cy - hr * 1.12, cx + hr * 1.12, cy + hr * 1.12), fill=(140, 80, 5, 255))
    for i, r in enumerate([1.0, 0.86, 0.72, 0.58]):
        col = (58, 34, 92, 255) if i % 2 == 0 else (42, 24, 68, 255)
        d.ellipse((cx - hr * r, cy - hr * r, cx + hr * r, cy + hr * r), fill=col)
    d.arc((cx - hr, cy - hr, cx + hr, cy + hr), 200, 340, fill=(255, 236, 160, 255), width=int(size * 0.012))
    d.line(pts + [pts[0]], fill=(110, 55, 0, 255), width=int(size * 0.008), joint='curve')
    spec = Image.new('L', (size, size), 0)
    ImageDraw.Draw(spec).ellipse((cx - R * 0.62, cy - R * 0.78, cx - R * 0.05, cy - R * 0.52), fill=170)
    L.paste((255, 255, 255, 255), (0, 0), ImageChops.multiply(spec.filter(ImageFilter.GaussianBlur(size * 0.012)), mask))
    sx, sy, sr = cx + R * 0.78, cy - R * 0.82, R * 0.32
    glow = Image.new('L', (size, size), 0)
    ImageDraw.Draw(glow).ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=120)
    L.paste((255, 240, 180, 255), (0, 0), glow.filter(ImageFilter.GaussianBlur(size * 0.03)))
    star = []
    for k in range(8):
        a = math.radians(k * 45 - 90)
        rr = sr if k % 2 == 0 else sr * 0.22
        star.append((sx + rr * math.cos(a), sy + rr * math.sin(a)))
    d.polygon(star, fill=(255, 255, 255, 255))
    return L


def background():
    bg = grad_bg(S, (46, 24, 92), (30, 110, 190))
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse((S * 0.18, S * 0.18, S * 0.82, S * 0.82), fill=110)
    bg.paste((120, 200, 255), (0, 0), glow.filter(ImageFilter.GaussianBlur(S * 0.08)))
    return bg


def main():
    os.makedirs(OUT, exist_ok=True)
    bg = background()
    full = bg.convert('RGBA')
    full.alpha_composite(nut_layer(S))
    full.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'icon-only.png'))
    full.convert('RGB').resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'play-store-icon-512.png'))
    nut_layer(S, 0.72).resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'icon-foreground.png'))
    bg.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'icon-background.png'))
    splash = grad_bg(S, (20, 32, 44), (29, 43, 58)).convert('RGBA')
    splash.alpha_composite(nut_layer(S, 0.45))
    for name in ('splash.png', 'splash-dark.png'):
        splash.convert('RGB').resize((2732, 2732), Image.LANCZOS).save(os.path.join(OUT, name))
    print('Wrote icons to', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
