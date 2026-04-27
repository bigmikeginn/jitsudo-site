#!/usr/bin/env python3
"""One-shot transformation: add AnimatedBg to every flat py-20 bg-black/surface section."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    *ROOT.glob('src/pages/*.astro'),
    *ROOT.glob('src/components/sections/*.astro'),
]

# Match: <section class="py-20 bg-(black|surface)"> followed by an immediate child <div class="...">
# Capture indent, bg colour, inner-div class.
PATTERN = re.compile(
    r'(?P<indent>[ \t]*)<section class="py-20 bg-(?P<bg>black|surface)">\n'
    r'(?P<innerIndent>[ \t]*)<div class="(?P<innerClass>[^"]+)">'
)

def transform(content: str, has_import: bool) -> tuple[str, int]:
    def repl(m: re.Match) -> str:
        indent = m.group('indent')
        bg = m.group('bg')
        inner_indent = m.group('innerIndent')
        inner_class = m.group('innerClass')
        return (
            f'{indent}<section class="relative py-20 bg-{bg} overflow-hidden">\n'
            f'{inner_indent}<AnimatedBg />\n'
            f'{inner_indent}<div class="relative z-10 {inner_class}">'
        )
    new_content, count = PATTERN.subn(repl, content)
    if count > 0 and not has_import:
        # Add import to the frontmatter block.
        # Insert AnimatedBg import after the last existing import line in the frontmatter.
        frontmatter_match = re.search(r'(---\n.*?)\n(---\n)', new_content, re.DOTALL)
        if frontmatter_match:
            fm = frontmatter_match.group(1)
            # Find last import line within fm
            import_lines = list(re.finditer(r"^import .+?;", fm, re.MULTILINE))
            if import_lines:
                last = import_lines[-1]
                injected = fm[:last.end()] + "\nimport AnimatedBg from '../ui/AnimatedBg.astro';" + fm[last.end():]
                # Decide path depth by counting "../"
                # Easier: detect if file is in pages/ vs components/sections/
                new_content = new_content.replace(fm, injected, 1)
    return new_content, count


def main() -> int:
    total_changes = 0
    for path in TARGETS:
        text = path.read_text(encoding='utf-8')
        # Path-aware import guess
        if 'src/pages' in path.as_posix():
            import_path = "'../components/ui/AnimatedBg.astro'"
        else:  # components/sections
            import_path = "'../ui/AnimatedBg.astro'"
        has_import = 'AnimatedBg' in text
        new_text, count = transform(text, has_import)
        if count > 0:
            # Fix import path if we just injected it
            if not has_import:
                new_text = new_text.replace(
                    "import AnimatedBg from '../ui/AnimatedBg.astro';",
                    f"import AnimatedBg from {import_path};",
                    1,
                )
            path.write_text(new_text, encoding='utf-8')
            print(f"  {path.relative_to(ROOT)}: +{count} sections")
            total_changes += count
    print(f"\nTotal sections updated: {total_changes}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
