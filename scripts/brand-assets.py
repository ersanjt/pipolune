"""Extract the logo, favicon and homepage imagery from the approved reference boards.

Sources (design/reference/):
  00-selected-direction.png  wordmark, hero illustration, season sprigs, dress and cardigan photos
  01-home-seasons.png        blouse photo
  03-mobile.png              four-season woodland (favicon / app icon and mobile hero)

Everything is cut from the boards, not redrawn, so the site matches them. The wordmark SVG is a
trace of the board lettering and stays provisional until the final hand-drawn vector exists.

Usage: pip install pillow numpy potracer && python scripts/brand-assets.py
"""

from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "design/reference"
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
HOME = PUBLIC / "images/home"

MILK = (247, 242, 232)
FOREST = (32, 61, 43)
SCALE = 4  # upscale before tracing for smoother curves
THRESHOLD = 110

B0 = Image.open(REF / "00-selected-direction.png").convert("RGB")
B1 = Image.open(REF / "01-home-seasons.png").convert("RGB")
B3 = Image.open(REF / "03-mobile.png").convert("RGB")

# Pixel boxes in board coordinates (left, top, right, bottom).
WORDMARK = (B0, (60, 20, 830, 250))
FOUR_SEASONS = (B3, (14, 446, 444, 876))
FOUR_SEASONS_TALL = (B3, (10, 440, 450, 990))
HOME_IMAGES = {
    "hero-woodland": (B0, (382, 311, 899, 621)),
    "season-spring": (B0, (49, 626, 157, 709)),
    "season-summer": (B0, (251, 626, 351, 709)),
    "season-autumn": (B0, (452, 626, 562, 709)),
    "season-winter": (B0, (677, 626, 782, 709)),
    "product-meadow-dress": (B0, (57, 722, 336, 943)),
    "product-forest-cardigan": (B0, (476, 722, 749, 943)),
    "product-willow-blouse": (B1, (529, 589, 761, 749)),
}


def crop(src) -> Image.Image:
    img, box = src
    return img.crop(box)


def hex_(rgb) -> str:
    return "#%02X%02X%02X" % rgb


def trace(mask: np.ndarray) -> str:
    # potracer traces False pixels as ink, so the mask is inverted here.
    curves = potrace.Bitmap(~mask).trace(turdsize=12, alphamax=1.0, opticurve=True, opttolerance=0.15)
    pt = lambda p: f"{p.x / SCALE:.2f} {p.y / SCALE:.2f}"
    out = []
    for curve in curves:
        out.append("M" + pt(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner:
                out.append("L" + pt(seg.c) + "L" + pt(seg.end_point))
            else:
                out.append("C" + pt(seg.c1) + " " + pt(seg.c2) + " " + pt(seg.end_point))
        out.append("Z")
    return "".join(out)


def rounded(img: Image.Image, size: int, radius: float) -> Image.Image:
    img = img.resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * radius), fill=255)
    img.putalpha(mask)
    return img


for d in (BRAND, HOME):
    d.mkdir(parents=True, exist_ok=True)

# --- Wordmark -------------------------------------------------------------------------------
board_logo = crop(WORDMARK)
lum = np.asarray(board_logo).astype(float).mean(axis=2)
bg, dark = np.percentile(lum, 60), np.percentile(lum, 0.5)
alpha = np.clip((bg - 10 - lum) / (bg - 10 - dark), 0, 1)
alpha[alpha < 0.12] = 0
rgba = np.zeros((*lum.shape, 4), dtype=np.uint8)
rgba[..., :3] = FOREST
rgba[..., 3] = (alpha * 255).astype(np.uint8)
logo = Image.fromarray(rgba, "RGBA")
logo = logo.crop(logo.getbbox())
logo.save(BRAND / "wordmark-concept.png", optimize=True)

big = np.asarray(logo.resize((logo.width * SCALE, logo.height * SCALE), Image.LANCZOS))[..., 3]
# Fill is a fixed colour because <img> ignores currentColor.
(BRAND / "wordmark.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {logo.width} {logo.height}" role="img" aria-label="Pipolune">'
    f'<path fill="{hex_(FOREST)}" fill-rule="evenodd" d="{trace(big > THRESHOLD)}"/></svg>\n',
    encoding="utf-8",
)

# --- Favicon / app icons: the four-season woodland ------------------------------------------
seasons = crop(FOUR_SEASONS)
rounded(seasons, 512, 0.18).save(BRAND / "icon-512.png", optimize=True)
rounded(seasons, 192, 0.18).save(BRAND / "icon-192.png", optimize=True)
seasons.resize((512, 512), Image.LANCZOS).save(BRAND / "icon-maskable-512.png", optimize=True)
seasons.resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", optimize=True)
rounded(seasons, 256, 0.18).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
rounded(seasons, 96, 0.18).save(PUBLIC / "favicon-96.png", optimize=True)
(PUBLIC / "favicon.svg").unlink(missing_ok=True)

# --- Homepage imagery -----------------------------------------------------------------------
for name, src in HOME_IMAGES.items():
    crop(src).save(HOME / f"{name}.webp", "WEBP", quality=90)
crop(FOUR_SEASONS_TALL).save(HOME / "hero-woodland-tall.webp", "WEBP", quality=88)

# --- Social share image 1200x630: wordmark over the woodland on milk ------------------------
og = Image.new("RGB", (1200, 630), MILK)
hero = crop(HOME_IMAGES["hero-woodland"])
hero = hero.resize((700, round(700 * hero.height / hero.width)), Image.LANCZOS)
og.paste(hero, (1200 - hero.width, (630 - hero.height) // 2))
w = Image.fromarray(np.dstack([np.full_like(big, c) for c in FOREST] + [big]), "RGBA")
w = w.resize((480, round(480 * w.height / w.width)), Image.LANCZOS)
og.paste(w, (60, (630 - w.height) // 2), w)
og.save(BRAND / "og-image.jpg", quality=86, optimize=True, progressive=True)

print("Assets written to public/, public/brand/ and public/images/home/")
