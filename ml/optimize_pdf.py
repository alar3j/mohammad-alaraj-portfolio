#!/usr/bin/env python3
"""Shrink the lead-magnet PDF so it downloads fast on mobile data.

Most visitors come from Instagram on a phone. The original guide is ~7.7 MB,
mostly oversized PNG photos and fully embedded fonts. This script
  * re-encodes large opaque photo streams to JPEG *in place* (same object
    number, alpha masks untouched). MuPDF's generic rewrite_images() breaks the
    pattern/XObject references Chrome/Skia writes, so we edit the streams
    ourselves,
  * subsets the embedded fonts to the glyphs actually used,
  * garbage-collects and deflates every stream,
  * renders every page of both files and fails if any page changed visibly.

Usage
  python ml/optimize_pdf.py input.pdf output.pdf [--quality 82]
"""
from __future__ import annotations

import argparse
import io
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image


def recompress_images(doc: pymupdf.Document, min_bytes: int, quality: int, max_side: int) -> int:
    """JPEG-encode big RGB/gray image streams in place. Returns bytes saved."""
    saved, seen = 0, set()
    for page in doc:
        for img in page.get_images(full=True):
            xref, smask = img[0], img[1]
            if xref in seen:
                continue
            seen.add(xref)
            info = doc.extract_image(xref)
            raw = info["image"]
            if len(raw) < min_bytes or info["ext"] in ("jpg", "jpeg", "jpx"):
                continue
            pil = Image.open(io.BytesIO(raw))
            if pil.mode not in ("RGB", "L"):
                continue  # palette/CMYK/alpha-in-stream: leave untouched
            if max(pil.size) > max_side and not smask:
                pil.thumbnail((max_side, max_side), Image.LANCZOS)
            buf = io.BytesIO()
            pil.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
            data = buf.getvalue()
            if len(data) >= len(raw) * 0.8:
                continue
            doc.update_stream(xref, data, compress=False)
            doc.xref_set_key(xref, "Filter", "/DCTDecode")
            doc.xref_set_key(xref, "DecodeParms", "null")
            doc.xref_set_key(xref, "Width", str(pil.width))
            doc.xref_set_key(xref, "Height", str(pil.height))
            doc.xref_set_key(xref, "BitsPerComponent", "8")
            doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB" if pil.mode == "RGB" else "/DeviceGray")
            saved += len(raw) - len(data)
    return saved


def max_page_diff(a: pymupdf.Document, b: pymupdf.Document, dpi: int = 40) -> float:
    worst = 0.0
    for pa, pb in zip(a, b):
        x = np.frombuffer(pa.get_pixmap(dpi=dpi).samples, np.uint8).astype(np.int16)
        y = np.frombuffer(pb.get_pixmap(dpi=dpi).samples, np.uint8).astype(np.int16)
        worst = max(worst, float(np.percentile(np.abs(x - y), 99.9)))
    return worst


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src", type=Path)
    ap.add_argument("dst", type=Path)
    ap.add_argument("--min-kb", type=int, default=60, help="only touch image streams above this size")
    ap.add_argument("--quality", type=int, default=82, help="JPEG quality")
    ap.add_argument("--max-side", type=int, default=1600, help="downscale opaque photos above this")
    ap.add_argument("--preview", type=Path, help="write a before/after PNG of page 1")
    args = ap.parse_args()

    doc = pymupdf.open(args.src)
    saved = recompress_images(doc, args.min_kb * 1024, args.quality, args.max_side)
    print(f"images: {saved / 1e6:.2f} MB saved")
    doc.subset_fonts()
    args.dst.parent.mkdir(parents=True, exist_ok=True)
    doc.save(args.dst, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, clean=True)

    before, after = args.src.stat().st_size, args.dst.stat().st_size
    print(f"{args.src.name}: {before / 1e6:.2f} MB -> {after / 1e6:.2f} MB ({1 - after / before:.0%} smaller)")

    diff = max_page_diff(pymupdf.open(args.src), pymupdf.open(args.dst))
    print(f"visual check: worst page difference {diff:.0f}/255 (99.9th percentile)")
    if diff > 60:
        raise SystemExit("a page changed visibly - not using this output")

    if args.preview:
        a = pymupdf.open(args.src)[0].get_pixmap(dpi=72)
        b = pymupdf.open(args.dst)[0].get_pixmap(dpi=72)
        out = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, a.width + b.width, a.height), False)
        out.set_rect(out.irect, (255, 255, 255))
        a.set_origin(0, 0)
        b.set_origin(a.width, 0)
        out.copy(a, a.irect)
        out.copy(b, b.irect)
        out.save(args.preview)


if __name__ == "__main__":
    main()
