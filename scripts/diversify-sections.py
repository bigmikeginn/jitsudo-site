#!/usr/bin/env python3
"""Replace stark bg-black with rotating treatments: charcoal gradient, parallax photo, surface."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    *ROOT.glob('src/pages/*.astro'),
    *ROOT.glob('src/components/sections/*.astro'),
]

# In a single file we want to cycle: charcoal -> photo -> charcoal -> photo
# But surface stays surface (it's already lighter and provides natural contrast).
TREATMENTS = ['bg-charcoal', 'bg-photo-parallax', 'bg-charcoal-warm', 'bg-photo-parallax-light']

# Match the section opener we already standardised on
PATTERN = re.compile(
    r'<section class="relative py-20 bg-black overflow-hidden">'
)


def transform(content: str) -> tuple[str, int]:
    counter = {'i': 0}
    def repl(_m: re.Match) -> str:
        treatment = TREATMENTS[counter['i'] % len(TREATMENTS)]
        counter['i'] += 1
        return f'<section class="relative py-20 {treatment} overflow-hidden">'
    new_content, count = PATTERN.subn(repl, content)
    return new_content, count


def main() -> int:
    total = 0
    for path in TARGETS:
        text = path.read_text(encoding='utf-8')
        new_text, count = transform(text)
        if count > 0:
            path.write_text(new_text, encoding='utf-8')
            print(f"  {path.relative_to(ROOT)}: {count} bg-black sections diversified")
            total += count
    print(f"\nTotal: {total} sections")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
