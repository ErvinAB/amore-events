"""
DEV-ONLY placeholder "photography" for design work until real product photos
exist. Procedural still lifes (linen, window light, soft shadows, grain).
Every image is stamped "SAMPLE IMAGE" so it can never pass as real.

  python3 -I scripts/dev-imagery/generate.py <out_dir>
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

random.seed(7)
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

IVORY = (240, 233, 224)
BLUSH = (229, 214, 208)
TAUPE = (183, 154, 127)
PLUM = (118, 63, 80)
CHARCOAL = (37, 35, 33)
GOLD = (200, 164, 108)
SILVER = (186, 186, 190)
LEATHER = (140, 98, 68)
OAK = (176, 136, 96)


def font(size):
    for p in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def linen(w, h, base):
    """Fabric-like surface: tinted noise, fine weave lines, soft gradient."""
    im = Image.new("RGB", (w, h), base)
    noise = Image.effect_noise((w // 2, h // 2), 22).resize((w, h)).filter(ImageFilter.GaussianBlur(1.2))
    tint = Image.merge("RGB", [noise] * 3)
    im = ImageChops.blend(im, ImageChops.multiply(im, ImageChops.add(tint, Image.new("RGB", (w, h), (110, 110, 110)))), 0.18)
    d = ImageDraw.Draw(im, "RGBA")
    for x in range(0, w, 3):
        d.line([(x, 0), (x, h)], fill=(255, 255, 255, random.randint(0, 10)))
    for y in range(0, h, 3):
        d.line([(0, y), (w, y)], fill=(0, 0, 0, random.randint(0, 8)))
    return im


def window_light(im, angle=-0.6, strength=0.22):
    """Diagonal soft window light with two blurred mullion shadows."""
    w, h = im.size
    light = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(light)
    for i in range(0, w + h, 4):
        v = int(255 * max(0, 1 - i / (w + h)) ** 1.6)
        d.line([(i, 0), (i - h * math.tan(-angle), h)], fill=v, width=5)
    light = light.filter(ImageFilter.GaussianBlur(60))
    bright = Image.new("RGB", (w, h), (255, 250, 242))
    im = Image.composite(ImageChops.blend(im, bright, strength * 1.6), im, light)
    shade = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(shade)
    for off in (int(w * 0.62), int(w * 0.82)):
        sd.polygon([(off, 0), (off + w * 0.05, 0), (off - h * 0.4 + w * 0.05, h), (off - h * 0.4, h)], fill=70)
    shade = shade.filter(ImageFilter.GaussianBlur(70))
    return Image.composite(ImageChops.multiply(im, Image.new("RGB", (w, h), (215, 205, 195))), im, shade)


def vignette(im, amount=0.28):
    w, h = im.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    dark = ImageChops.multiply(im, Image.new("RGB", (w, h), tuple(int(255 * (1 - amount)) for _ in range(3))))
    return Image.composite(im, dark, m)


def grain(im, amount=10):
    w, h = im.size
    n = Image.effect_noise((w, h), amount).convert("RGB")
    return ImageChops.add(ImageChops.subtract(im, Image.new("RGB", (w, h), (amount // 2,) * 3)), n.point(lambda v: v // 12))


def shadow(im, mask, dx, dy, blur, alpha):
    sh = Image.new("L", im.size, 0)
    sh.paste(mask.point(lambda v: int(v * alpha)), (dx, dy))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.composite(ImageChops.multiply(im, Image.new("RGB", im.size, (120, 105, 95))), im, sh)


def shaded(im, mask, color, highlight=(0.35, 0.3), spec=0.55, edge=0.35):
    """Fill mask with a lit material: radial highlight + darkened edges."""
    w, h = im.size
    bbox = mask.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    grad = Image.new("L", (w, h), 0)
    gd = ImageDraw.Draw(grad)
    cx, cy = x0 + (x1 - x0) * highlight[0], y0 + (y1 - y0) * highlight[1]
    r = max(x1 - x0, y1 - y0)
    for i in range(30, 0, -1):
        rr = r * i / 30
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=int(255 * (1 - i / 30) ** 1.4))
    grad = grad.filter(ImageFilter.GaussianBlur(r * 0.05))
    base = Image.new("RGB", (w, h), tuple(int(c * 0.78) for c in color))
    lit = Image.new("RGB", (w, h), tuple(min(255, int(c + (255 - c) * spec)) for c in color))
    body = Image.composite(lit, base, grad)
    er = mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(10))
    rim = ImageChops.subtract(mask, er)
    body = Image.composite(ImageChops.multiply(body, Image.new("RGB", (w, h), (int(255 * (1 - edge)),) * 3)), body, rim)
    return Image.composite(body, im, mask)


def new_mask(size):
    m = Image.new("L", size, 0)
    return m, ImageDraw.Draw(m)


def stamp(im):
    d = ImageDraw.Draw(im, "RGBA")
    f = font(max(18, im.size[0] // 70))
    d.text((int(im.size[0] * 0.025), int(im.size[1] * 0.955)), "SAMPLE IMAGE · development only", fill=(60, 50, 45, 150), font=f)
    return im


def heart_points(cx, cy, s, n=240):
    pts = []
    for i in range(n):
        t = i / n * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s, cy - y * s))
    return pts


# ---------------------------------------------------------------- objects
def chain(im, pts, color, width):
    m, d = new_mask(im.size)
    d.line(pts, fill=255, width=width, joint="curve")
    im = shadow(im, m, 6, 10, 6, 0.5)
    return shaded(im, m, color, spec=0.7, edge=0.2)


def curve(p0, p1, p2, n=80):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]


def pendant(im, cx, cy, s, color=GOLD):
    w, h = im.size
    im = chain(im, curve((cx - w * 0.32, -20), (cx - w * 0.05, cy - s * 30), (cx, cy - s * 13)), color, max(3, int(s * 0.5)))
    im = chain(im, curve((cx + w * 0.32, -20), (cx + w * 0.05, cy - s * 30), (cx, cy - s * 13)), color, max(3, int(s * 0.5)))
    m, d = new_mask(im.size)
    d.polygon(heart_points(cx, cy, s), fill=255)
    im = shadow(im, m, int(s * 1.2), int(s * 2), int(s * 2), 0.55)
    return shaded(im, m, color, highlight=(0.3, 0.25), spec=0.65)


def ring(im, cx, cy, r, color, tilt=0.42):
    m, d = new_mask(im.size)
    d.ellipse([cx - r, cy - r * tilt, cx + r, cy + r * tilt], fill=255)
    inner = r * 0.78
    d.ellipse([cx - inner, cy - inner * tilt + r * 0.04, cx + inner, cy + inner * tilt + r * 0.04], fill=0)
    im = shadow(im, m, int(r * 0.12), int(r * 0.2), int(r * 0.12), 0.5)
    return shaded(im, m, color, highlight=(0.25, 0.2), spec=0.75, edge=0.3)


def gift_box(im, x, y, bw, bh, color, ribbon=PLUM):
    m, d = new_mask(im.size)
    d.rectangle([x, y, x + bw, y + bh], fill=255)
    im = shadow(im, m, int(bw * 0.06), int(bh * 0.08), int(bw * 0.06), 0.55)
    im = shaded(im, m, color, highlight=(0.2, 0.1), spec=0.25, edge=0.15)
    lm, ld = new_mask(im.size)
    ld.rectangle([x - bw * 0.03, y - bh * 0.02, x + bw * 1.03, y + bh * 0.2], fill=255)
    im = shaded(im, lm, tuple(min(255, c + 12) for c in color), highlight=(0.2, 0.1), spec=0.25, edge=0.2)
    rm, rd = new_mask(im.size)
    rd.rectangle([x + bw * 0.45, y - bh * 0.02, x + bw * 0.55, y + bh], fill=255)
    rd.rectangle([x - bw * 0.03, y + bh * 0.07, x + bw * 1.03, y + bh * 0.13], fill=255)
    im = shaded(im, rm, ribbon, spec=0.35, edge=0.2)
    bm, bd = new_mask(im.size)
    cx = x + bw * 0.5
    bd.ellipse([cx - bw * 0.26, y - bh * 0.17, cx - bw * 0.02, y + bh * 0.02], fill=255)
    bd.ellipse([cx + bw * 0.02, y - bh * 0.17, cx + bw * 0.26, y + bh * 0.02], fill=255)
    im = shadow(im, bm, 6, 8, 8, 0.4)
    return shaded(im, bm, ribbon, highlight=(0.3, 0.2), spec=0.4, edge=0.3)


def tag(im, cx, cy, tw, th, color, angle=-12, string=TAUPE):
    layer = Image.new("L", (int(tw * 1.6), int(th * 1.6)), 0)
    ld = ImageDraw.Draw(layer)
    ox, oy = tw * 0.3, th * 0.3
    ld.rounded_rectangle([ox, oy, ox + tw, oy + th], radius=int(tw * 0.18), fill=255)
    ld.ellipse([ox + tw / 2 - tw * 0.08, oy + th * 0.09, ox + tw / 2 + tw * 0.08, oy + th * 0.09 + tw * 0.16], fill=0)
    layer = layer.rotate(angle, resample=Image.BICUBIC)
    m = Image.new("L", im.size, 0)
    m.paste(layer, (int(cx - layer.size[0] / 2), int(cy - layer.size[1] / 2)))
    im = shadow(im, m, int(tw * 0.05), int(th * 0.06), int(tw * 0.06), 0.5)
    im = shaded(im, m, color, highlight=(0.3, 0.2), spec=0.3, edge=0.25)
    hx, hy = cx + math.sin(math.radians(angle)) * th * 0.33, cy - math.cos(math.radians(angle)) * th * 0.33
    return chain(im, curve((hx, hy), (hx + tw * 0.6, hy - th * 0.5), (hx + tw * 1.3, hy - th * 0.2)), string, max(3, int(tw * 0.025)))


def keyring(im, cx, cy, s, color=LEATHER):
    im = tag(im, cx, cy, s, s * 1.5, color, angle=8, string=SILVER)
    return ring(im, int(cx + s * 0.95), int(cy - s * 0.85), int(s * 0.38), SILVER, tilt=0.9)


def frame(im, x, y, fw, fh, color=OAK):
    m, d = new_mask(im.size)
    d.rectangle([x, y, x + fw, y + fh], fill=255)
    im = shadow(im, m, int(fw * 0.05), int(fh * 0.04), int(fw * 0.05), 0.55)
    im = shaded(im, m, color, highlight=(0.2, 0.15), spec=0.3, edge=0.15)
    inner = [x + fw * 0.12, y + fh * 0.1, x + fw * 0.88, y + fh * 0.78]
    pm, pd = new_mask(im.size)
    pd.rectangle(inner, fill=255)
    photo = Image.new("RGB", im.size, (214, 200, 190))
    ph = ImageDraw.Draw(photo)
    ph.ellipse([inner[0] + fw * 0.1, inner[1] + fh * 0.12, inner[0] + fw * 0.35, inner[1] + fh * 0.32], fill=(190, 170, 160))
    ph.ellipse([inner[0] + fw * 0.36, inner[1] + fh * 0.16, inner[0] + fw * 0.6, inner[1] + fh * 0.34], fill=(175, 150, 140))
    photo = photo.filter(ImageFilter.GaussianBlur(fw * 0.03))
    im = Image.composite(photo, im, pm)
    lm, ld = new_mask(im.size)
    ld.rectangle([x + fw * 0.12, y + fh * 0.83, x + fw * 0.88, y + fh * 0.9], fill=255)
    return Image.composite(Image.new("RGB", im.size, (245, 240, 232)), im, lm)


def candle(im, cx, base_y, cw, ch, color=(232, 224, 214)):
    m, d = new_mask(im.size)
    d.rectangle([cx - cw / 2, base_y - ch, cx + cw / 2, base_y], fill=255)
    d.ellipse([cx - cw / 2, base_y - cw * 0.18, cx + cw / 2, base_y + cw * 0.18], fill=255)
    im = shadow(im, m, int(cw * 0.12), int(cw * 0.06), int(cw * 0.1), 0.5)
    im = shaded(im, m, color, highlight=(0.25, 0.3), spec=0.3, edge=0.2)
    tm, td = new_mask(im.size)
    td.ellipse([cx - cw / 2, base_y - ch - cw * 0.16, cx + cw / 2, base_y - ch + cw * 0.16], fill=255)
    im = Image.composite(Image.new("RGB", im.size, tuple(min(255, c + 14) for c in color)), im, tm)
    lm, ld = new_mask(im.size)
    ld.rectangle([cx - cw / 2 + 2, base_y - ch * 0.55, cx + cw / 2 - 2, base_y - ch * 0.3], fill=255)
    return Image.composite(ImageChops.multiply(im, Image.new("RGB", im.size, (226, 214, 205))), im, lm)


def finish(im, light=True):
    if light:
        im = window_light(im)
    return stamp(grain(vignette(im)))


def scene(name, w, h, base, draw, light=True):
    im = linen(w, h, base)
    im = draw(im, w, h)
    finish(im, light).save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    print("wrote", name)


# ---------------------------------------------------------------- scenes
def hero(im, w, h):
    im = gift_box(im, int(w * 0.52), int(h * 0.42), int(w * 0.24), int(h * 0.34), (236, 228, 218))
    im = tag(im, int(w * 0.43), int(h * 0.7), int(w * 0.07), int(w * 0.1), (247, 242, 234), angle=-18)
    im = pendant(im, int(w * 0.84), int(h * 0.62), w / 380)
    return ring(im, int(w * 0.34), int(h * 0.55), int(w * 0.055), GOLD)


def hero_tall(im, w, h):
    im = gift_box(im, int(w * 0.25), int(h * 0.45), int(w * 0.5), int(h * 0.27), (236, 228, 218))
    im = tag(im, int(w * 0.3), int(h * 0.82), int(w * 0.16), int(w * 0.22), (247, 242, 234), angle=-14)
    return pendant(im, int(w * 0.72), int(h * 0.3), w / 260)


scene("hero-wide", 2400, 1500, IVORY, hero)
scene("hero-tall", 1500, 1875, IVORY, hero_tall)
scene("cat-personalised-gifts", 1600, 2000, (236, 226, 216), lambda im, w, h: tag(im, w * 0.5, h * 0.52, w * 0.36, w * 0.52, (247, 242, 234), angle=-10))
scene("cat-jewellery", 1600, 2000, BLUSH, lambda im, w, h: pendant(im, int(w * 0.5), int(h * 0.56), w / 150))
scene("cat-keychains", 1600, 2000, (226, 222, 214), lambda im, w, h: keyring(im, w * 0.47, h * 0.55, w * 0.3))
scene("cat-home-decor", 1600, 2000, (232, 226, 218), lambda im, w, h: candle(frame(im, int(w * 0.16), int(h * 0.22), int(w * 0.46), int(h * 0.46)), w * 0.74, h * 0.78, w * 0.2, h * 0.24))
scene("cat-love-anniversary", 1600, 2000, (233, 219, 214), lambda im, w, h: ring(ring(im, int(w * 0.43), int(h * 0.55), int(w * 0.17), GOLD), int(w * 0.6), int(h * 0.6), int(w * 0.14), SILVER))
scene("story-detail", 2000, 1500, (238, 230, 220), lambda im, w, h: tag(tag(im, w * 0.42, h * 0.52, w * 0.2, w * 0.28, (247, 242, 234), angle=-16), w * 0.62, h * 0.5, w * 0.16, w * 0.22, LEATHER, angle=12))

# Product photos (4:5), used by the dev seed.
scene("p-necklace-1", 1600, 2000, BLUSH, lambda im, w, h: pendant(im, int(w * 0.5), int(h * 0.58), w / 160))
scene("p-necklace-2", 1600, 2000, (232, 226, 220), lambda im, w, h: pendant(im, int(w * 0.5), int(h * 0.52), w / 110, SILVER))
scene("p-necklace-3", 1600, 2000, IVORY, lambda im, w, h: gift_box(pendant(im, int(w * 0.66), int(h * 0.3), w / 260), int(w * 0.18), int(h * 0.55), int(w * 0.46), int(h * 0.3), (236, 228, 218)))
scene("p-keyring-1", 1600, 2000, (226, 222, 214), lambda im, w, h: keyring(im, w * 0.47, h * 0.55, w * 0.3))
scene("p-keyring-2", 1600, 2000, IVORY, lambda im, w, h: keyring(im, w * 0.5, h * 0.55, w * 0.42, (96, 70, 55)))
scene("p-frame-1", 1600, 2000, (232, 226, 218), lambda im, w, h: frame(im, int(w * 0.2), int(h * 0.2), int(w * 0.6), int(h * 0.58)))
