#!/usr/bin/env python3
"""
Pre-commit image converter.

For every PNG or JPG staged under public/images/, this script:
  1. Converts it to WebP (quality 82, method 6).
  2. Stages the WebP file.
  3. Unstages and deletes the original so only WebP lands in the commit.
  4. Updates any simultaneously staged .md/.astro files that reference
     the old filename, and re-stages those files.

Run directly:  python scripts/convert-images.py
Called by:     .git/hooks/pre-commit
"""

import os
import re
import subprocess
import sys

try:
    from PIL import Image
except ImportError:
    print("[convert-images] Pillow not found — skipping image conversion.")
    print("  Install with: pip install pillow")
    sys.exit(0)

QUALITY = 82
METHOD = 6
IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
CONTENT_EXTS = {".md", ".astro", ".ts", ".js"}


def git(*args):
    result = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    return result.stdout.strip()


def staged_files():
    """Return list of (status, path) for all staged files."""
    out = git("diff", "--cached", "--name-status")
    files = []
    for line in out.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2:
            files.append((parts[0], parts[1]))
    return files


def main():
    staged = staged_files()
    if not staged:
        sys.exit(0)

    # Collect staged image files under public/images/
    to_convert = [
        path for status, path in staged
        if status in ("A", "M")
        and os.path.splitext(path)[1].lower() in IMAGE_EXTS
        and path.startswith("public/images/")
    ]

    if not to_convert:
        sys.exit(0)

    # Collect staged text files that might reference the images
    staged_text = [
        path for status, path in staged
        if status in ("A", "M")
        and os.path.splitext(path)[1].lower() in CONTENT_EXTS
    ]

    converted = 0
    for rel_path in to_convert:
        src = rel_path  # relative to repo root
        base, ext = os.path.splitext(src)
        dst = base + ".webp"

        if not os.path.exists(src):
            continue  # deleted file, skip

        try:
            img = Image.open(src)
            orig_kb = os.path.getsize(src) // 1024
            img.save(dst, "WEBP", quality=QUALITY, method=METHOD)
            new_kb = os.path.getsize(dst) // 1024
            print(f"[convert-images] {src} ({orig_kb} KB) -> {dst} ({new_kb} KB)")
        except Exception as e:
            print(f"[convert-images] Failed to convert {src}: {e}")
            continue

        # Stage the WebP, unstage + delete the original
        subprocess.run(["git", "add", dst])
        subprocess.run(["git", "rm", "--cached", src], capture_output=True)
        os.remove(src)

        # Update references in staged text files
        old_name = os.path.basename(src)
        new_name = os.path.basename(dst)
        for text_path in staged_text:
            if not os.path.exists(text_path):
                continue
            with open(text_path, "r", encoding="utf-8") as f:
                content = f.read()
            updated = content.replace(old_name, new_name)
            if updated != content:
                with open(text_path, "w", encoding="utf-8") as f:
                    f.write(updated)
                subprocess.run(["git", "add", text_path])
                print(f"[convert-images]   updated reference in {text_path}")

        converted += 1

    if converted:
        print(f"[convert-images] Converted {converted} image(s) to WebP.")

    sys.exit(0)


if __name__ == "__main__":
    main()
