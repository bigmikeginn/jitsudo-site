import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const root = 'dist';
const htmlFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) htmlFiles.push(file);
  }
}

walk(root);
const failures = [];

for (const file of htmlFiles) {
  const document = parse(fs.readFileSync(file, 'utf8'));
  for (const element of document.querySelectorAll('[href], [src]')) {
    const value = element.getAttribute('href') ?? element.getAttribute('src');
    if (!value || !value.startsWith('/') || value.startsWith('//')) continue;
    const clean = value.split(/[?#]/)[0];
    const candidates = [
      path.join(root, clean),
      path.join(root, clean, 'index.html'),
      path.join(root, `${clean}.html`),
    ];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(`${file}: ${value}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML files; no broken internal links or assets found.`);
