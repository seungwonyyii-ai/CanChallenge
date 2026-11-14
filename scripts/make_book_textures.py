"""
Build BOOK theme textures from the supplied images (originals are never modified).

  assets-src/books/<id>_front.jpeg  flat front-cover scan  -> public/assets/books/<id>_front.jpg
  assets-src/books/<id>_full.png    3/4 product render     -> public/assets/books/<id>_spine.jpg

Front: the scan is used as-is apart from trimming a dark 1-3 px scan border on
the right edge and resizing.

Spine: the 3/4 render shows the spine on the left, fully visible and only
foreshortened horizontally. We find its left edge (first non-white column) and
the spine/cover crease (the strongest vertical edge just right of it), crop
that strip and stretch it to a straight rectangle. The 3D spine face is a
rectangle, so the photo's cover is never duplicated onto the model.
Nothing outside the visible strip is invented. The top few pixels may include
the book's top face (same light grey as the spine) and the image is cropped at
the bottom; both are a fraction of a percent of the spine height.

Run:  python3 scripts/make_book_textures.py      (Pillow + numpy)
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "books"
OUT = ROOT / "public" / "assets" / "books"
IDS = ["moon_and_sixpence", "do_you_like_brahms", "animal_farm", "demian", "unbearable_lightness"]

FRONT_H = 1024
SPINE_SIZE = (160, 1024)


def front(book: str) -> None:
    im = Image.open(SRC / f"{book}_front.jpeg").convert("RGB")
    a = np.asarray(im).astype(int)
    # trim dark columns at the right edge (scan border)
    right = a.shape[1]
    while right > a.shape[1] - 8 and a[:, right - 1].mean() < 200:
        right -= 1
    im = im.crop((0, 0, right, im.height))
    w = round(im.width * FRONT_H / im.height)
    im.resize((w, FRONT_H), Image.LANCZOS).save(OUT / f"{book}_front.jpg", quality=88, optimize=True)
    return im.size


def spine(book: str) -> tuple[int, int, int]:
    im = Image.open(SRC / f"{book}_full.png").convert("RGB")
    g = np.asarray(im.convert("L")).astype(int)
    h = g.shape[0]
    left = int(np.argmax((255 - g[h // 2]) > 12))
    band = g[int(h * 0.1): int(h * 0.92)]
    grad = np.abs(np.diff(band, axis=1)).mean(0)
    crease = left + 15 + int(np.argmax(grad[left + 15: left + 140]))
    col = g[:, left + 3]
    top = int(np.argmax((255 - col) > 12))
    strip = im.crop((left + 2, top, crease - 1, h))
    strip.resize(SPINE_SIZE, Image.LANCZOS).save(OUT / f"{book}_spine.jpg", quality=90, optimize=True)
    return left, crease, top


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for b in IDS:
        fw, fh = front(b)
        l, c, t = spine(b)
        print(f"{b}: front {fw}x{fh}, spine strip x {l}..{c} (w {c - l}px) from y {t}")
