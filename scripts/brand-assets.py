"""Regenerate logo, favicon and social-share assets from the approved concept board.

Source: design/reference/00-selected-direction.png. The outputs are traced from a raster concept,
so they are provisional until the final hand-drawn vector logo exists.

Usage: pip install pillow numpy potracer && python scripts/brand-assets.py
"""

from pathlib import Path

import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "design/reference/00-selected-direction.png"
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"

MILK = (247, 242, 232)
FOREST = (32, 61, 43)
SCALE = 4  # upscale before tracing for smoother curves
THRESHOLD = 110


def wordmark_alpha() -> Image.Image:
    """Cut the large wordmark from the board and turn its ink into an alpha mask."""
    crop = SOURCE_IMG.crop((60, 20, 830, 250))
    lum = np.asarray(crop).astype(float).mean(axis=2)
    bg, dark = np.percentile(lum, 60), np.percentile(lum, 0.5)
    alpha = np.clip((bg - 10 - lum) / (bg - 10 - dark), 0, 1)
    alpha[alpha < 0.12] = 0
    rgba = np.zeros((*lum.shape, 4), dtype=np.uint8)
    rgba[..., :3] = FOREST
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    return img.crop(img.getbbox())


def trace(mask: np.ndarray, dx: float = 0, dy: float = 0) -> str:
    # potracer traces False pixels as ink, so the mask is inverted here.
    curves = potrace.Bitmap(~mask).trace(turdsize=20, alphamax=1.0, opticurve=True, opttolerance=0.2)
    pt = lambda p: f"{p.x / SCALE + dx:.2f} {p.y / SCALE + dy:.2f}"
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


def hex_(rgb) -> str:
    return "#%02X%02X%02X" % rgb


SOURCE_IMG = Image.open(SOURCE).convert("RGB")
BRAND.mkdir(parents=True, exist_ok=True)

# Wordmark: raster (PNG) and traced vector (SVG). Fill is a fixed colour because <img> ignores currentColor.
logo = wordmark_alpha()
logo.save(BRAND / "wordmark-concept.png", optimize=True)
big = np.asarray(logo.resize((logo.width * SCALE, logo.height * SCALE), Image.LANCZOS))[..., 3]
(BRAND / "wordmark.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {logo.width} {logo.height}" role="img" aria-label="Pipolune">'
    f'<path fill="{hex_(FOREST)}" fill-rule="evenodd" d="{trace(big > THRESHOLD)}"/></svg>\n',
    encoding="utf-8",
)

# Monogram: the P (everything left of the first gap after x=120 in the wordmark).
cols = (np.asarray(logo)[..., 3] > 40).sum(axis=0)
cut = next(x for x in range(120, 260) if cols[x] == 0)
p_mask = big[:, : cut * SCALE] > THRESHOLD
ys, xs = np.where(p_mask)
p_mask = p_mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
pw, ph = p_mask.shape[1] / SCALE, p_mask.shape[0] / SCALE
side = max(pw, ph) * 1.25
(PUBLIC / "favicon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side:.2f} {side:.2f}">'
    f'<rect width="100%" height="100%" rx="{side * 0.2:.2f}" fill="{hex_(MILK)}"/>'
    f'<path fill="{hex_(FOREST)}" fill-rule="evenodd" d="{trace(p_mask, (side - pw) / 2, (side - ph) / 2)}"/></svg>\n',
    encoding="utf-8",
)

p_alpha = big[:, : cut * SCALE]
p_rgba = np.zeros((*p_alpha.shape, 4), dtype=np.uint8)
p_rgba[..., :3] = FOREST
p_rgba[..., 3] = p_alpha
p_img = Image.fromarray(p_rgba, "RGBA")
p_img = p_img.crop(p_img.getbbox())


def monogram(size: int, pad: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), MILK + (255,))
    inner = int(size * (1 - 2 * pad))
    ratio = inner / max(p_img.size)
    mark = p_img.resize((round(p_img.width * ratio), round(p_img.height * ratio)), Image.LANCZOS)
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    return canvas


monogram(180, 0.12).save(PUBLIC / "apple-touch-icon.png", optimize=True)
monogram(192, 0.12).save(BRAND / "icon-192.png", optimize=True)
monogram(512, 0.12).save(BRAND / "icon-512.png", optimize=True)
monogram(512, 0.22).save(BRAND / "icon-maskable-512.png", optimize=True)
monogram(48, 0.06).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Hero banner: landscape from the board, background shifted to the page milk colour.
banner = np.asarray(SOURCE_IMG.crop((840, 0, 1536, 255))).astype(float)
banner = np.clip(banner * (np.array(MILK) / np.array([253, 251, 241])), 0, 255).astype(np.uint8)
banner_img = Image.fromarray(banner)
banner_img.save(BRAND / "woodland-four-seasons-banner.webp", "WEBP", quality=88)

# Social share image 1200x630: wordmark over the banner on milk.
og = Image.new("RGB", (1200, 630), MILK)
b = banner_img.resize((1200, int(1200 * banner_img.height / banner_img.width)), Image.LANCZOS)
og.paste(b, (0, 630 - b.height))
w = Image.fromarray(np.dstack([np.full_like(big, c) for c in FOREST] + [big]), "RGBA")
w = w.resize((640, round(640 * w.height / w.width)), Image.LANCZOS)
og.paste(w, ((1200 - w.width) // 2, 90), w)
og.save(BRAND / "og-image.jpg", quality=86, optimize=True, progressive=True)

print("Brand assets written to public/ and public/brand/")
