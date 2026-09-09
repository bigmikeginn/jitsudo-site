#!/usr/bin/env python3
"""Generate the favicon and home-screen icon set from the master Jitsu-Do logo.

Run after changing the logo:
    pip install pillow potracer
    python3 scripts/generate-app-icons.py

The source lockup has "JITSU-DO" set below the mark; only the sun-and-mountain
above it is used, since wordmarks are unreadable at icon sizes. The mark is
drawn white-on-black: the master art has a black mountain, so it is repainted
white while the red sun is left alone.

Outputs into public/:
    icon-192.png, icon-512.png        -> manifest icons (purpose "any")
    icon-maskable-512.png             -> manifest icon (purpose "maskable")
    apple-touch-icon.png              -> iOS "Add to Home Screen"
    favicon.ico                       -> browser tab (16/32/48)
    favicon.svg                       -> browser tab, vector
"""

from pathlib import Path

import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/images/logo-no-words-no-kanji-GPcCluiLoDTlDcGX.png"
OUT = ROOT / "public"

# The "JITSU-DO" wordmark starts at this row in the master art; crop above it.
WORDMARK_TOP = 1089

BACKGROUND = (0, 0, 0, 255)
MOUNTAIN = (255, 255, 255)
SUN = "#e60012"

# Fraction of the canvas width the mark occupies. Maskable icons get cropped to
# a circle of 80% diameter, so the wide mark has to sit well inside that.
FILL_ANY = 0.88
FILL_MASKABLE = 0.66

# A pixel counts as sun (not mountain) when red dominates this much.
REDNESS = 40


def load_mark() -> Image.Image:
    """The sun-and-mountain mark, wordmark cropped off and trimmed."""
    art = Image.open(SOURCE).convert("RGBA")
    mark = art.crop((0, 0, art.width, WORDMARK_TOP))
    opaque = mark.getchannel("A").point(lambda v: 255 if v > 16 else 0)
    return mark.crop(opaque.getbbox())


def whiten_mountain(mark: Image.Image) -> Image.Image:
    """Repaint the near-black mountain white, leaving the red sun alone."""
    out = mark.copy()
    src, dst = mark.load(), out.load()
    for y in range(mark.height):
        for x in range(mark.width):
            r, g, b, a = src[x, y]
            if a and r - max(g, b) < REDNESS:
                dst[x, y] = (*MOUNTAIN, a)
    return out


def render(mark: Image.Image, size: int, fill: float) -> Image.Image:
    w = round(size * fill)
    h = round(w * mark.height / mark.width)
    scaled = mark.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    canvas.alpha_composite(scaled, ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB")


def trace(mask: "np.ndarray") -> str:
    """Trace a boolean mask into SVG path data.

    potrace outlines the low/False region, so the mask is inverted to make the
    shape of interest the one that gets traced.
    """
    mask = ~mask
    parts = []
    for curve in potrace.Bitmap(mask).trace(turdsize=8):
        s = curve.start_point
        parts.append(f"M{s.x:.1f} {s.y:.1f}")
        for seg in curve:
            e = seg.end_point
            if seg.is_corner:
                c = seg.c
                parts.append(f"L{c.x:.1f} {c.y:.1f}L{e.x:.1f} {e.y:.1f}")
            else:
                a, b = seg.c1, seg.c2
                parts.append(
                    f"C{a.x:.1f} {a.y:.1f} {b.x:.1f} {b.y:.1f} {e.x:.1f} {e.y:.1f}"
                )
        parts.append("Z")
    return "".join(parts)


def write_svg(mark: Image.Image, path: Path) -> None:
    """A vector favicon: the sun and mountain traced from the master art.

    Drawn on a transparent ground so the tab icon works on light and dark
    browser chrome alike; the sun is traced as one silhouette with the
    mountain laid over it.
    """
    w, h = mark.width, mark.height
    rgba = np.array(mark)
    opaque = rgba[..., 3] > 127
    redness = rgba[..., 0].astype(int) - np.maximum(rgba[..., 1], rgba[..., 2])
    sun = opaque & (redness >= REDNESS)
    mountain = opaque & ~sun

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'
        f'<path fill="{SUN}" d="{trace(sun)}"/>'
        f'<path fill="#111" d="{trace(mountain)}"/>'
        '<style>@media (prefers-color-scheme: dark){path:last-of-type{fill:#fff}}</style>'
        "</svg>"
    )
    path.write_text(svg)


def main() -> None:
    mark = whiten_mountain(load_mark())

    for name, size, fill in [
        ("icon-192.png", 192, FILL_ANY),
        ("icon-512.png", 512, FILL_ANY),
        ("icon-maskable-512.png", 512, FILL_MASKABLE),
        ("apple-touch-icon.png", 180, FILL_ANY),
    ]:
        render(mark, size, fill).save(OUT / name, optimize=True)
        print(f"wrote public/{name} ({size}x{size})")

    render(mark, 256, FILL_ANY).save(
        OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("wrote public/favicon.ico (16/32/48)")

    write_svg(load_mark(), OUT / "favicon.svg")
    print("wrote public/favicon.svg")


if __name__ == "__main__":
    main()
