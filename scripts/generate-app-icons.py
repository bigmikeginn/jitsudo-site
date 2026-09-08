#!/usr/bin/env python3
"""Generate the PWA / home-screen icon set from the master Jitsu-Do logo.

Run after changing the logo:
    pip install pillow
    python3 scripts/generate-app-icons.py

Outputs into public/:
    icon-192.png, icon-512.png        -> manifest icons (purpose "any")
    icon-maskable-512.png             -> manifest icon (purpose "maskable")
    apple-touch-icon.png              -> iOS "Add to Home Screen"
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/images/karate-logo-white-text-oHuRP0peEmmhqRFY.png"
OUT = ROOT / "public"

# Matches the brand navy used by the existing app icon.
BACKGROUND = (26, 26, 46, 255)

# Fraction of the canvas width the logo lockup occupies.
# Maskable icons get cropped to a circle of 80% diameter, so the wide lockup
# has to sit well inside that safe zone.
FILL_ANY = 0.90
FILL_MASKABLE = 0.66


def render(size: int, fill: float) -> Image.Image:
    logo = Image.open(SOURCE).convert("RGBA")
    target_w = round(size * fill)
    target_h = round(target_w * logo.height / logo.width)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    canvas.alpha_composite(logo, ((size - target_w) // 2, (size - target_h) // 2))
    return canvas.convert("RGB")


def main() -> None:
    for name, size, fill in [
        ("icon-192.png", 192, FILL_ANY),
        ("icon-512.png", 512, FILL_ANY),
        ("icon-maskable-512.png", 512, FILL_MASKABLE),
        ("apple-touch-icon.png", 180, FILL_ANY),
    ]:
        path = OUT / name
        render(size, fill).save(path, optimize=True)
        print(f"wrote {path.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()
