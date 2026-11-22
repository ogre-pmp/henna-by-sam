"""Generate the Henna by Sam app icon (PNG sizes + SVG favicon + ICO).

Design: a henna-style flower in cream on a henna-brown gradient.
No text, filled overlapping shapes, motif kept inside the maskable safe zone.
Usage: python make_icons.py <output_dir>
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

U = 1024                      # design units
C = U / 2
BG_TOP = (176, 108, 64)       # warm henna (top-left)
BG_BOT = (104, 52, 24)        # deep henna (bottom-right)
CREAM = (250, 238, 222)


def petal(angle_deg, r0, r1, w, n=60):
    """Teardrop petal from radius r0 to r1 along angle, max half-width w."""
    a = math.radians(angle_deg - 90)
    ax, ay = math.cos(a), math.sin(a)
    px, py = -ay, ax
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        d = r0 + t * (r1 - r0)
        hw = w * (math.sin(math.pi * t) ** 0.9) * (1 - 0.35 * t)
        cx, cy = C + ax * d, C + ay * d
        left.append((cx + px * hw, cy + py * hw))
        right.append((cx - px * hw, cy - py * hw))
    return left + right[::-1]


# Layers: (kind, params, opacity)
LAYERS = []
for k in range(8):                                   # outer petals
    LAYERS.append(("poly", petal(k * 45, 70, 330, 92), 0.32))
for k in range(8):                                   # inner petals
    LAYERS.append(("poly", petal(k * 45 + 22.5, 60, 250, 70), 0.92))
for k in range(16):                                  # dot ring
    a = math.radians(k * 22.5 - 90 + 11.25)
    LAYERS.append(("circle", (C + math.cos(a) * 360, C + math.sin(a) * 360, 13), 0.75))
LAYERS.append(("circle", (C, C, 86), 1.0))           # center disc (cream)
LAYERS.append(("circle_bg", (C, C, 62), 1.0))        # henna ring cut
LAYERS.append(("circle", (C, C, 34), 1.0))           # center dot


def gradient(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
    return img


def bg_at(x, y):
    t = (x + y) / (2 * (U - 1))
    return tuple(round(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))


def render(size, ss=4):
    S = size * ss
    k = S / U
    base = gradient(256).resize((S, S), Image.BICUBIC).convert("RGBA")
    # soft top highlight
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse((-0.2 * S, -0.55 * S, 1.2 * S, 0.45 * S), fill=(255, 235, 210, 26))
    hl = hl.filter(ImageFilter.GaussianBlur(S * 0.12))
    base = Image.alpha_composite(base, hl)
    for kind, p, op in LAYERS:
        layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        if kind == "poly":
            d.polygon([(x * k, y * k) for x, y in p], fill=CREAM + (round(255 * op),))
        else:
            cx, cy, r = p
            col = bg_at(cx, cy) if kind == "circle_bg" else CREAM
            d.ellipse(((cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k), fill=col + (round(255 * op),))
        base = Image.alpha_composite(base, layer)
    return base.resize((size, size), Image.LANCZOS)


def svg():
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {U} {U}">',
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="rgb{BG_TOP}"/><stop offset="1" stop-color="rgb{BG_BOT}"/>'
        '</linearGradient></defs>',
        f'<rect width="{U}" height="{U}" rx="{round(U * 0.2237)}" fill="url(#g)"/>',
    ]
    cream = "rgb%s" % (CREAM,)
    for kind, p, op in LAYERS:
        if kind == "poly":
            pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in p[::2])
            parts.append(f'<polygon points="{pts}" fill="{cream}" fill-opacity="{op}"/>')
        else:
            cx, cy, r = p
            col = "rgb%s" % (bg_at(cx, cy),) if kind == "circle_bg" else cream
            parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{col}" fill-opacity="{op}"/>')
    parts.append("</svg>")
    return "".join(parts)


big = render(1024)
for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
    big.resize((size, size), Image.LANCZOS).convert("RGB").save(os.path.join(OUT, name), optimize=True)
big.convert("RGB").save(os.path.join(OUT, "icon-1024.png"), optimize=True)

# Favicon PNG/ICO with rounded corners (tabs show the full square)
def rounded(img, size):
    im = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=round(size * 4 * 0.2237), fill=255)
    im.putalpha(mask.resize((size, size), Image.LANCZOS))
    return im

rounded(big, 32).save(os.path.join(OUT, "favicon-32.png"))
rounded(big, 64).save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
with open(os.path.join(OUT, "icon.svg"), "w", encoding="utf-8") as f:
    f.write(svg())
print("written:", sorted(os.listdir(OUT)))
