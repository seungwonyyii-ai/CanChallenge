"""
Turn front-view product photos (assets-src/drinks/<id>.jpg) into cylinder
label textures (public/assets/drinks/<id>.jpg) for the 3D cans.

A front photo shows ~180° of the can, squeezed toward the edges. For every
output column at angle φ around the can (φ = 0 faces the camera) we sample the
photo at x = cx + R·sin φ, which undoes that squeeze. Only |φ| ≤ PHI_MAX is
trustworthy; the rest of the circumference mirrors the front so the back has
no hard seam (the back is never shown in the game).

Run:  python3 scripts/make_can_labels.py
Requires: Pillow, numpy
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "drinks"
OUT = ROOT / "public" / "assets" / "drinks"

# Body region per photo (pixels): left/right edge of the cylinder and the
# top/bottom of the printed body (metal neck and base excluded).
CROPS = {
    "pear":    dict(left=151, right=440, top=176, bottom=458),
    "plum":    dict(left=192, right=420, top=96,  bottom=500),
    "pine":    dict(left=176, right=377, top=50,  bottom=496),
    "morning": dict(left=156, right=388, top=36,  bottom=498),
    "sikhye":  dict(left=195, right=876, top=222, bottom=836),
}

PHI_MAX = math.radians(78)
OUT_W, OUT_H = 1024, 512


def fold(phi: np.ndarray) -> np.ndarray:
    """Mirror angles beyond ±PHI_MAX back into the trusted front band."""
    p = phi.copy()
    p = np.where(p > PHI_MAX, 2 * PHI_MAX - p, p)
    p = np.where(p < -PHI_MAX, -2 * PHI_MAX - p, p)
    return np.clip(p, -PHI_MAX, PHI_MAX)


def unwrap(drink: str) -> None:
    c = CROPS[drink]
    img = Image.open(SRC / f"{drink}.jpg").convert("RGB")
    a = np.asarray(img).astype(np.float32)
    cx = (c["left"] + c["right"]) / 2
    r = (c["right"] - c["left"]) / 2 - 1.5  # stay just inside the silhouette

    # u = 0.5 faces the camera (matches CylinderGeometry thetaStart = π)
    u = (np.arange(OUT_W) + 0.5) / OUT_W
    phi = fold((u - 0.5) * 2 * math.pi)
    xs = cx + r * np.sin(phi)
    ys = c["top"] + (np.arange(OUT_H) + 0.5) / OUT_H * (c["bottom"] - c["top"])

    # bilinear sample
    x0 = np.floor(xs).astype(int); fx = (xs - x0)[None, :, None]
    y0 = np.floor(ys).astype(int); fy = (ys - y0)[:, None, None]
    x1 = np.clip(x0 + 1, 0, a.shape[1] - 1); y1 = np.clip(y0 + 1, 0, a.shape[0] - 1)
    p00 = a[y0][:, x0]; p01 = a[y0][:, x1]; p10 = a[y1][:, x0]; p11 = a[y1][:, x1]
    out = (p00 * (1 - fx) + p01 * fx) * (1 - fy) + (p10 * (1 - fx) + p11 * fx) * fy

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT / f"{drink}.jpg", quality=88, optimize=True)
    print(f"{drink}: {OUT / f'{drink}.jpg'}")


if __name__ == "__main__":
    for d in CROPS:
        unwrap(d)
