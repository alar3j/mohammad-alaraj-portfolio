#!/usr/bin/env python3
"""Extract the 30 tool logos from the guide PDF for the landing page.

The guide shows every tool with its logo on a white rounded tile. We find those
tiles (vector shapes), pair each one with the tool name printed next to it,
render the tile at high resolution and save a small transparent WebP:
apps/waitlist/public/logos/<tool id>.webp (128x128).

Usage
  python ml/extract_logos.py path/to/TechAlaraj_30_AI_Tools_Guide.pdf
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "apps" / "waitlist" / "public" / "logos"
SIZE = 128
RADIUS = 0.2  # corner radius relative to the tile (matches the guide's tiles)


def tiles_on(page: pymupdf.Page) -> list[pymupdf.Rect]:
    """White, square, ~66pt rounded tiles = the logo cards (not the small header icons)."""
    found: list[pymupdf.Rect] = []
    for dr in page.get_drawings():
        r, fill = dr["rect"], dr.get("fill")
        if fill and min(fill) > 0.9 and 50 < r.width < 80 and abs(r.width - r.height) < 3:
            if not any(abs(r.y0 - f.y0) < 4 and abs(r.x0 - f.x0) < 4 for f in found):
                found.append(r)
    return found


def name_lines(page: pymupdf.Page) -> list[tuple[str, pymupdf.Rect]]:
    lines = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            if max(s["size"] for s in line["spans"]) >= 20:
                text = "".join(s["text"] for s in line["spans"]).strip()
                lines.append((text, pymupdf.Rect(line["bbox"])))
    return lines


def rounded(img: Image.Image) -> Image.Image:
    mask = Image.new("L", (img.width * 4, img.height * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, mask.width - 1, mask.height - 1), radius=int(mask.width * RADIUS), fill=255
    )
    img = img.convert("RGBA")
    img.putalpha(mask.resize(img.size, Image.LANCZOS))
    return img


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--sheet", type=Path, help="also write a contact sheet PNG for a visual check")
    args = ap.parse_args()

    tools = json.loads((ROOT / "data" / "tools.json").read_text("utf-8"))["tools"]
    first_word = {t["id"]: t["name"].split()[0].lower() for t in tools}
    doc = pymupdf.open(args.pdf)
    OUT.mkdir(parents=True, exist_ok=True)
    done: dict[int, Image.Image] = {}

    for page in doc:
        lines = name_lines(page)
        for tile in tiles_on(page):
            cy = (tile.y0 + tile.y1) / 2
            # the tool name sits left of the tile, vertically within its height
            near = [t for t, r in lines if r.x1 < tile.x0 and tile.y0 - 15 < (r.y0 + r.y1) / 2 < tile.y1 + 15]
            tid = next(
                (i for i, w in first_word.items() for t in near if t.lower().startswith(w)),
                None,
            )
            if tid is None or tid in done:
                continue
            pix = page.get_pixmap(matrix=pymupdf.Matrix(5, 5), clip=tile, alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            img = rounded(img.resize((SIZE, SIZE), Image.LANCZOS))
            img.save(OUT / f"{tid}.webp", "WEBP", quality=92, method=6)
            done[tid] = img
            _ = cy

    missing = [t["name"] for t in tools if t["id"] not in done]
    total = sum(p.stat().st_size for p in OUT.glob("*.webp"))
    print(f"logos: {len(done)}/30 -> {OUT.relative_to(ROOT.parent)} ({total / 1024:.0f} KB)")
    if missing:
        raise SystemExit(f"missing: {', '.join(missing)}")

    if args.sheet:
        sheet = Image.new("RGBA", (SIZE * 10 + 90, SIZE * 3 + 20), (13, 20, 36, 255))
        for k, tid in enumerate(sorted(done)):
            sheet.alpha_composite(done[tid], (10 + (k % 10) * (SIZE + 8), 5 + (k // 10) * (SIZE + 5)))
        sheet.save(args.sheet)


if __name__ == "__main__":
    main()
