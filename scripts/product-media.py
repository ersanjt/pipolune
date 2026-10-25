"""Prepare supplier product media (1688, Taobao, other shops) for the Pipolune catalogue.

Requires Python 3.10+, Pillow, and ffmpeg for videos (on PATH, or `pip install imageio-ffmpeg`).

    python scripts/product-media.py fetch  TMP_DIR URL [URL ...]       download originals (01.jpg, 02.jpg, …)
    python scripts/product-media.py sheet  TMP_DIR [--out sheet.jpg]   labelled contact sheet to review and pick photos
    python scripts/product-media.py cover  SRC OUT.webp                cut-out on the warm studio background (1250×1000)
    python scripts/product-media.py photo  SRC OUT.webp [--crop] [--edge 1200]
    python scripts/product-media.py frames VIDEO OUT.jpg               4×2 frame grid to check for text overlays
    python scripts/product-media.py video  VIDEO OUT.mp4 [--poster OUT.webp --at 3.0] [--width 540]

`--crop` cuts the photo out of a supplier detail slide (white page with captions or Chinese titles around it).
Originals stay in TMP_DIR (outside the repo); only the WebP/MP4 outputs go to public/.
"""

from __future__ import annotations

import argparse
import glob
import os
import shutil
import subprocess
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFilter

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
REFERERS = {'alicdn.com': 'https://detail.1688.com/', 'taobao.com': 'https://detail.1688.com/', 'tmall.com': 'https://detail.tmall.com/'}
BACKGROUND = (226, 214, 199)
BACKGROUND_LOW = (214, 200, 183)
SHADOW = (150, 128, 104)


def fetch(out_dir: str, urls: list[str]) -> None:
    os.makedirs(out_dir, exist_ok=True)
    for i, url in enumerate(urls, 1):
        referer = next((r for host, r in REFERERS.items() if host in url), url)
        ext = os.path.splitext(url.split('?')[0])[1].lower() or '.jpg'
        if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.mp4'):
            ext = '.jpg'
        path = os.path.join(out_dir, f'{i:02d}{ext}')
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': referer})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f:
            shutil.copyfileobj(r, f)
        size = os.path.getsize(path)
        if size < 2048:
            print(f'{path}: only {size} bytes — the server probably refused the request', file=sys.stderr)
        else:
            print(path, size // 1024, 'KB')


def sheet(src_dir: str, out: str | None) -> None:
    files = sorted(f for f in glob.glob(os.path.join(src_dir, '*')) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
    if not files:
        sys.exit(f'No images in {src_dir}')
    w, cols, label = 220, 5, 18
    tiles = []
    for f in files:
        im = Image.open(f).convert('RGB')
        tiles.append((os.path.basename(f), im.size, im.resize((w, max(1, round(im.height * w / im.width))))))
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    height = sum(max(t[2].height for t in r) + label for r in rows)
    canvas = Image.new('RGB', (cols * (w + 6), height), 'white')
    y = 0
    for r in rows:
        x = 0
        for name, size, im in r:
            canvas.paste(im, (x, y + label))
            ImageDraw.Draw(canvas).text((x + 3, y + 3), f'{name} {size[0]}x{size[1]}', fill='black')
            x += w + 6
        y += max(t[2].height for t in r) + label
    out = out or os.path.join(src_dir, '_sheet.jpg')
    canvas.save(out, quality=85)
    print(out)


def photo_box(im: Image.Image) -> tuple[int, int, int, int]:
    """Largest band of rows that are mostly photo rather than white page or caption text."""
    g = im.convert('L')
    w, h = g.size
    x0, x1 = int(w * 0.06), int(w * 0.94)
    rows = [1 - sum(g.crop((x0, y, x1, y + 1)).histogram()[245:]) / (x1 - x0) for y in range(h)]
    best, start = (0, 0, h), None
    for y, f in enumerate(rows + [0]):
        if f > 0.6 and start is None:
            start = y
        elif f <= 0.6 and start is not None:
            if y - start > best[0]:
                best = (y - start, start, y)
            start = None
    _, top, bottom = best
    span = max(1, bottom - top - 20)
    cols = [1 - sum(g.crop((x, top + 10, x + 1, bottom - 10)).histogram()[245:]) / span for x in range(w)]
    xs = [x for x, f in enumerate(cols) if f > 0.6] or [0, w - 1]
    inset = 8
    return (xs[0] + inset, top + inset, xs[-1] - inset, bottom - inset)


def save_webp(im: Image.Image, out: str, edge: int, quality: int = 82) -> None:
    im = im.convert('RGB')
    scale = min(1, edge / max(im.size))
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    im.save(out, 'WEBP', quality=quality, method=6)
    print(out, im.size, os.path.getsize(out) // 1024, 'KB')


def photo(src: str, out: str, crop: bool, edge: int) -> None:
    im = Image.open(src)
    save_webp(im.crop(photo_box(im)) if crop else im, out, edge)


def cover(src: str, out: str) -> None:
    """Cut the garment off a white/light backdrop and place it on the shop's warm background with a soft shadow."""
    img = Image.open(src).convert('RGB')
    w, h = img.size
    probe = img.copy()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        ImageDraw.floodfill(probe, (x, y), (255, 0, 255), thresh=28)
    mask = Image.new('L', (w, h), 255)
    px, mp = probe.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == (255, 0, 255):
                mp[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    bbox = mask.getbbox()
    if not bbox or (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > 0.97 * w * h:
        sys.exit('No plain backdrop found to cut out. Pick a photo on a white background, or use `photo` instead.')
    item, m = img.crop(bbox), mask.crop(bbox)
    W, H = 1250, 1000
    grad = Image.linear_gradient('L').resize((W, H))
    canvas = Image.composite(Image.new('RGB', (W, H), BACKGROUND_LOW), Image.new('RGB', (W, H), BACKGROUND), grad.point(lambda v: int(v * 0.55)))
    scale = min((H * 0.86) / item.height, (W * 0.8) / item.width)
    item = item.resize((int(item.width * scale), int(item.height * scale)), Image.LANCZOS)
    m = m.resize(item.size, Image.LANCZOS)
    x, y = (W - item.width) // 2, int(H * 0.07)
    shadow = Image.new('L', (W, H), 0)
    shadow.paste(m.point(lambda v: int(v * 0.35)), (x + 10, y + 16))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.composite(Image.new('RGB', (W, H), SHADOW), canvas, shadow)
    canvas.paste(item, (x, y), m)
    save_webp(canvas, out, edge=W, quality=86)


def ffmpeg() -> str:
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found. Install it, or run: pip install imageio-ffmpeg')


def run(args: list[str]) -> None:
    subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def frames(video: str, out: str) -> None:
    run(['-i', video, '-vf', 'fps=1/2,scale=240:-1,tile=4x2', '-frames:v', '1', out])
    print(out)


def video(src: str, out: str, poster: str | None, at: float, width: int) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    run(['-i', src, '-an', '-vf', f'scale={width}:-2', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '26',
         '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
    print(out, os.path.getsize(out) // 1024, 'KB')
    if poster:
        tmp = out + '.poster.png'
        run(['-ss', str(at), '-i', src, '-frames:v', '1', '-vf', f'scale={width}:-2', tmp])
        save_webp(Image.open(tmp), poster, edge=width, quality=80)
        os.remove(tmp)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('fetch'); a.add_argument('dir'); a.add_argument('urls', nargs='+')
    a = sub.add_parser('sheet'); a.add_argument('dir'); a.add_argument('--out')
    a = sub.add_parser('cover'); a.add_argument('src'); a.add_argument('out')
    a = sub.add_parser('photo'); a.add_argument('src'); a.add_argument('out'); a.add_argument('--crop', action='store_true'); a.add_argument('--edge', type=int, default=1200)
    a = sub.add_parser('frames'); a.add_argument('video'); a.add_argument('out')
    a = sub.add_parser('video'); a.add_argument('src'); a.add_argument('out'); a.add_argument('--poster'); a.add_argument('--at', type=float, default=3.0); a.add_argument('--width', type=int, default=540)
    o = p.parse_args()
    if o.cmd == 'fetch':
        fetch(o.dir, o.urls)
    elif o.cmd == 'sheet':
        sheet(o.dir, o.out)
    elif o.cmd == 'cover':
        cover(o.src, o.out)
    elif o.cmd == 'photo':
        photo(o.src, o.out, o.crop, o.edge)
    elif o.cmd == 'frames':
        frames(o.video, o.out)
    else:
        video(o.src, o.out, o.poster, o.at, o.width)


if __name__ == '__main__':
    main()
