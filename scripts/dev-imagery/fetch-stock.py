#!/usr/bin/env python3
"""
Stand-in photography until the owners upload their own.

Downloads CC0 (public domain) photos from the WordPress Photo Directory
(wordpress.org/photos), crops them to the shapes the storefront uses, applies
one gentle shared colour grade so photos from different photographers sit
together, and writes:

  public/dev-imagery/{hero-tall,story-detail}.jpg   (committed)
  .dev-samples/{p-*,cat-*}.jpg                               (gitignored; used by seed-dev.mjs)
  public/dev-imagery/CREDITS.md                               (source of every photo)

CC0 needs no attribution, but we record sources anyway so the owners know
exactly what to replace.

  python3 scripts/dev-imagery/fetch-stock.py
  node --env-file=.env.local scripts/seed-dev.mjs --refresh-images
"""
import io
import json
import os
import subprocess

from PIL import Image, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUBLIC = os.path.join(ROOT, "public", "dev-imagery")
SAMPLES = os.path.join(ROOT, ".dev-samples")

# Openverse ids (api.openverse.org) for WordPress Photo Directory images.
SRC = {
    "hands": "7c6ad4f8",
    "tealights": "e4447ee7",
    "envelopes": "e2f7f3be",
    "earrings": "f1cc6208",
    "keyring": "f109f830",
    "vase": "8b244f3e",
    "roses": "40386a50",
    "heart-necklace": "bda9d393",
    "ring": "85d66b87",
    "plaque": "f279c075",
}

# (output path, source, width, height, focus x, focus y)  focus = 0..1 of source
OUT = [
    (f"{PUBLIC}/hero-tall.jpg", "hands", 1500, 1875, 0.5, 0.42),
    (f"{PUBLIC}/story-detail.jpg", "tealights", 2000, 1500, 0.5, 0.5),
    (f"{SAMPLES}/cat-personalised-gifts.jpg", "envelopes", 1600, 1600, 0.5, 0.5),
    (f"{SAMPLES}/cat-jewellery.jpg", "earrings", 1600, 2000, 0.62, 0.5),
    (f"{SAMPLES}/cat-keychains.jpg", "keyring", 1600, 2000, 0.55, 0.5),
    (f"{SAMPLES}/cat-home-decor.jpg", "vase", 1600, 2000, 0.5, 0.5),
    (f"{SAMPLES}/cat-love-anniversary.jpg", "roses", 1600, 2000, 0.5, 0.5),
    (f"{SAMPLES}/p-necklace-1.jpg", "heart-necklace", 1600, 2000, 0.5, 0.5),
    (f"{SAMPLES}/p-necklace-2.jpg", "heart-necklace", 1600, 2000, 0.38, 0.4, 1.7),
    (f"{SAMPLES}/p-necklace-3.jpg", "ring", 1600, 2000, 0.5, 0.5),
    (f"{SAMPLES}/p-keyring-1.jpg", "keyring", 1600, 2000, 0.72, 0.6, 1.4),
    (f"{SAMPLES}/p-keyring-2.jpg", "keyring", 1600, 2000, 0.5, 0.5),
    (f"{SAMPLES}/p-frame-1.jpg", "plaque", 1600, 2000, 0.55, 0.55),
]


def lookup(prefix: str) -> dict:
    """Source record (url, title, creator, landing page) from stock-sources.json."""
    with open(os.path.join(os.path.dirname(__file__), "stock-sources.json")) as f:
        return json.load(f)[prefix]


def fetch(url: str) -> Image.Image:
    data = subprocess.run(["curl", "-sfL", "-m", "60", url], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data)).convert("RGB")


def grade(im: Image.Image) -> Image.Image:
    """One shared, gentle grade: slightly softer colour, a touch warmer."""
    im = ImageEnhance.Color(im).enhance(0.88)
    im = ImageEnhance.Contrast(im).enhance(0.96)
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * 1.02 + 2)))
    b = b.point(lambda v: int(v * 0.97))
    return Image.merge("RGB", (r, g, b))


def crop(im: Image.Image, w: int, h: int, fx: float, fy: float, zoom: float = 1.0) -> Image.Image:
    sw, sh = im.size
    target = w / h
    cw, ch = (sw, sw / target) if sw / sh < target else (sh * target, sh)
    cw, ch = cw / zoom, ch / zoom
    x = min(max(fx * sw - cw / 2, 0), sw - cw)
    y = min(max(fy * sh - ch / 2, 0), sh - ch)
    return im.crop((int(x), int(y), int(x + cw), int(y + ch))).resize((w, h), Image.LANCZOS)


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)
    os.makedirs(SAMPLES, exist_ok=True)
    cache: dict[str, Image.Image] = {}
    for key, oid in SRC.items():
        rec = lookup(oid)
        print("fetch", key, rec["url"])
        cache[key] = grade(fetch(rec["url"]))
    for out, key, w, h, fx, fy, *z in OUT:
        crop(cache[key], w, h, fx, fy, z[0] if z else 1.0).save(out, "JPEG", quality=84, optimize=True, progressive=True)
        print("wrote", os.path.relpath(out, ROOT))

    lines = [
        "# Stand-in photography",
        "",
        "All photos are **CC0 (public domain)** from the WordPress Photo Directory —",
        "free for commercial use, no attribution required. They are placeholders:",
        "replace them with the shop's own photography (see the photography brief in",
        "`docs/DESIGN_DIRECTION.md`). Regenerate with `scripts/dev-imagery/fetch-stock.py`.",
        "",
        "| Used for | Photo | Photographer | Source |",
        "|---|---|---|---|",
    ]
    for key, oid in SRC.items():
        rec = lookup(oid)
        used = ", ".join(sorted({os.path.basename(o[0]) for o in OUT if o[1] == key}))
        title = rec['title'].split('. ')[0].rstrip('.')[:70]
        lines.append(f"| {used} | {title} | {rec['creator']} | {rec['landing']} |")
    with open(os.path.join(PUBLIC, "CREDITS.md"), "w") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
