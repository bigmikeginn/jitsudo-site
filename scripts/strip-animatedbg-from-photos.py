#!/usr/bin/env python3
"""Remove <AnimatedBg /> from sections that already have a parallax photo bg."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    *ROOT.glob('src/pages/*.astro'),
    *ROOT.glob('src/components/sections/*.astro'),
]

# Match: <section class="...bg-photo-parallax..."> ... <AnimatedBg /> on the next line
# Strip the AnimatedBg line.
PATTERN = re.compile(
    r'(<section class="[^"]*bg-photo-parallax(?:-light)?[^"]*">\n)'
    r'[ \t]*<AnimatedBg[^/]*/>\n'
)


def transform(content: str) -> tuple[str, int]:
    new_content, count = PATTERN.subn(r'\1', content)
    return new_content, count


def main() -> int:
    total = 0
    for path in TARGETS:
        text = path.read_text(encoding='utf-8')
        new_text, count = transform(text)
        if count > 0:
            path.write_text(new_text, encoding='utf-8')
            print(f"  {path.relative_to(ROOT)}: stripped {count} AnimatedBg")
            total += count
    print(f"\nTotal: {total}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
