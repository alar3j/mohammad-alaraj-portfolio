#!/usr/bin/env python3
"""Turn the real cut-out photos into depth maps for the 3D portrait.

Model: depth-anything/Depth-Anything-V2-Small-hf (Apache-2.0) via 🤗 transformers.

The photo itself is never altered. We only estimate *how far* every pixel is
from the camera; the landing page then pushes the photo's pixels forward/back
in a WebGL shader (three.js), so the portrait reacts to the mouse / phone tilt
with real parallax instead of a flat image.

Post-processing
  * depth is normalised inside the person mask only (background ignored)
  * a gentle blur removes high-frequency noise that would look like "spikes"
  * depth is extended outside the silhouette (nearest-pixel fill) so triangles
    on the edge of the cut-out never stretch when the mesh is displaced

Usage
  python ml/depth_portrait.py                       # default photos
  python ml/depth_portrait.py path/to/cutout.webp   # any RGBA cut-out
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

MODEL_ID = "depth-anything/Depth-Anything-V2-Small-hf"
ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent / "apps" / "waitlist" / "public"
DEFAULT_INPUTS = [PUBLIC / "img" / "alaraj-hero.webp", PUBLIC / "img" / "alaraj-final.webp"]


def shift(a: np.ndarray, dy: int, dx: int) -> np.ndarray:
    """Shift without wrap-around (new cells are zero)."""
    out = np.zeros_like(a)
    h, w = a.shape
    out[max(dy, 0): h + min(dy, 0), max(dx, 0): w + min(dx, 0)] = a[max(-dy, 0): h + min(-dy, 0), max(-dx, 0): w + min(-dx, 0)]
    return out


def fill_outside(depth: np.ndarray, mask: np.ndarray, iterations: int = 24) -> np.ndarray:
    """Grow the silhouette's depth a few pixels outwards, then fade to the floor value.

    Edge triangles of the displaced mesh then stay short, so the cut-out
    outline never smears when the portrait rotates.
    """
    d, m = np.where(mask, depth, 0).astype(np.float32), mask.copy()
    floor = float(depth[mask].min()) if mask.any() else 0.0
    for _ in range(iterations):
        acc = np.zeros_like(d)
        cnt = np.zeros_like(d)
        md = np.where(m, d, 0)
        mf = m.astype(np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            acc += shift(md, dy, dx)
            cnt += shift(mf, dy, dx)
        grow = (~m) & (cnt > 0)
        if not grow.any():
            break
        d[grow] = acc[grow] / cnt[grow] * 0.97 + floor * 0.03  # ease towards the floor
        m |= grow
    d[~m] = floor
    return d


def process(path: Path, estimator, scale: float) -> Path:
    rgba = Image.open(path).convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"), dtype=np.float32) / 255.0
    mask = alpha > 0.5

    # The model sees the person on a neutral grey backdrop (like a studio wall).
    rgb = Image.new("RGB", rgba.size, (96, 100, 112))
    rgb.paste(rgba, mask=rgba.getchannel("A"))

    pred = estimator(rgb)["predicted_depth"]  # relative inverse depth, larger = closer
    depth = np.asarray(
        Image.fromarray(pred.squeeze().numpy().astype(np.float32)).resize(rgba.size, Image.BICUBIC),
        dtype=np.float32,
    )

    inside = depth[mask]
    lo, hi = np.percentile(inside, 1), np.percentile(inside, 99.5)
    depth = np.clip((depth - lo) / max(hi - lo, 1e-6), 0, 1)
    depth = 0.12 + 0.88 * depth  # keep the whole body slightly in front of the background
    depth = fill_outside(depth, mask)

    out = Image.fromarray((depth * 255).round().astype(np.uint8), "L")
    out = out.filter(ImageFilter.GaussianBlur(radius=max(1.0, rgba.width / 320)))
    if scale != 1:
        out = out.resize((round(rgba.width * scale), round(rgba.height * scale)), Image.LANCZOS)

    dst = path.with_name(path.stem + "-depth.png")
    out.save(dst, optimize=True)
    print(f"  {path.name} -> {dst.name} {out.size[0]}x{out.size[1]} ({dst.stat().st_size / 1024:.0f} KB)")
    return dst


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="*", type=Path, default=DEFAULT_INPUTS)
    ap.add_argument("--scale", type=float, default=0.5, help="output size relative to the photo")
    args = ap.parse_args()

    from transformers import pipeline  # imported late: heavy

    print(f"Loading {MODEL_ID} from the Hugging Face Hub ...")
    estimator = pipeline("depth-estimation", model=MODEL_ID, device="cpu")
    for p in args.inputs:
        process(p, estimator, args.scale)


if __name__ == "__main__":
    main()
