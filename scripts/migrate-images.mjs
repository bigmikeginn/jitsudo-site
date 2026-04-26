#!/usr/bin/env node
// Phase 4: Download WP media library → public/images/, rewrite markdown refs to local paths.
// Usage: node scripts/migrate-images.mjs

import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const WP_BASE = 'https://sienna-ram-139653.hostingersite.com';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES_DIR = resolve(REPO_ROOT, 'public/images');
const CONTENT_DIR = resolve(REPO_ROOT, 'src/content');

// Filenames containing these strings are excluded per user direction (no Sensei Luke / James Bo)
const SKIP_PATTERNS = ['sensei-luke', 'james-bo-close'];

function shouldSkip(sourceUrl) {
  const file = basename(sourceUrl).toLowerCase();
  return SKIP_PATTERNS.some((p) => file.startsWith(p.replace('-', '-')));
}

// Strip -scaled suffix: foo-bar-scaled.jpg → foo-bar.jpg
function localFilename(sourceUrl) {
  const file = basename(sourceUrl);
  return file.replace(/-scaled(\.[^.]+)$/, '$1');
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

// Replace all staging image URLs in a markdown string with local /images/<filename>
function rewriteUrls(content, skippedUrls) {
  // Replace skipped image lines entirely (remove the ![alt](url) markdown)
  for (const url of skippedUrls) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, 'g'), '');
  }

  // Rewrite full staging URLs and relative /wp-content/uploads/ paths to /images/<filename>
  content = content.replace(
    /(https:\/\/sienna-ram-139653\.hostingersite\.com)?\/wp-content\/uploads\/\d{4}\/\d{2}\/([^)"\s]+)/g,
    (_match, _host, filename) => '/images/' + filename.replace(/-scaled(\.[^.]+)$/, '$1'),
  );

  return content;
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true });

  // 1. Fetch media library
  console.log('Fetching media library…');
  const res = await fetch(
    `${WP_BASE}/wp-json/wp/v2/media?per_page=100&_fields=id,slug,source_url`,
  );
  if (!res.ok) throw new Error(`Media API ${res.status}`);
  const media = await res.json();
  console.log(`Found ${media.length} media items.`);

  const skippedUrls = [];

  // 2. Download images
  console.log('\nDownloading images…');
  for (const item of media) {
    const { source_url } = item;
    if (shouldSkip(source_url)) {
      console.log(`  ⊘ SKIP  ${basename(source_url)}`);
      skippedUrls.push(source_url);
      continue;
    }
    const filename = localFilename(source_url);
    const destPath = resolve(IMAGES_DIR, filename);
    try {
      await downloadImage(source_url, destPath);
      console.log(`  ✓ ${filename}`);
    } catch (err) {
      console.warn(`  ✗ ${filename}: ${err.message}`);
    }
  }

  // 3. Rewrite markdown content files
  console.log('\nRewriting markdown refs…');
  const dirs = ['pages', 'posts'];
  for (const dir of dirs) {
    const dirPath = resolve(CONTENT_DIR, dir);
    let files;
    try {
      files = await readdir(dirPath);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const filePath = resolve(dirPath, file);
      const original = await readFile(filePath, 'utf8');
      const updated = rewriteUrls(original, skippedUrls);
      if (updated !== original) {
        await writeFile(filePath, updated, 'utf8');
        console.log(`  ✓ ${dir}/${file}`);
      }
    }
  }

  console.log('\nDone. Verify with: grep -r "hostingersite" src/content/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
