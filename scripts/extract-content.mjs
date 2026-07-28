#!/usr/bin/env node
// Extract WordPress pages + posts from staging site → markdown files in src/content/.
// Pulls content via REST API, scrapes <head> for SEO meta (Rank Math renders into HTML).
//
// Usage: node scripts/extract-content.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';
import { parse } from 'node-html-parser';

const WP_BASE = 'https://sienna-ram-139653.hostingersite.com';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_DIR = resolve(REPO_ROOT, 'src/content/pages');
const POSTS_DIR = resolve(REPO_ROOT, 'src/content/posts');

// Slug remap: WP slug → new site slug (per architecture doc URL plan)
const SLUG_REMAP = {
  'home': 'home',
  'about': 'about',
  'programs': 'programs',
  'adult-programs': 'adult-programs',
  'youth-programs': 'youth-programs',
  'kids-programs': 'kids-programs',
  'karate': 'karate',
  'bjj': 'bjj',
  'instructors': 'instructors',
  'schedule': 'schedule',
  'trial-class': 'trial',
  'join': 'join',
  'contact': 'contact',
  'shop': 'shop',
  'resources': 'resources',
  'video-resources': 'video-resources',
  'martial-arts-blogs': 'blog-archive',
  'blog': 'blog-stub',
  'welcome': 'welcome',
};

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
});

// Strip WordPress block wrappers and empty paragraphs
turndown.addRule('stripEmptyParagraphs', {
  filter: (node) => node.nodeName === 'P' && !node.textContent?.trim() && !node.querySelector('img'),
  replacement: () => '',
});

function decodeEntities(s) {
  return s
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function escapeYaml(s) {
  if (s == null) return '""';
  const str = String(s).trim();
  // Always quote and escape any embedded double quotes
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchHead(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  [warn] HEAD fetch failed for ${url}: ${res.status}`);
    return {};
  }
  const html = await res.text();
  const root = parse(html);

  const getMeta = (selector, attr = 'content') => {
    const el = root.querySelector(selector);
    return el ? decodeEntities(el.getAttribute(attr) || '') : '';
  };

  return {
    title: decodeEntities(root.querySelector('title')?.textContent || '').trim(),
    description: getMeta('meta[name="description"]'),
    ogImage: getMeta('meta[property="og:image"]'),
    robots: getMeta('meta[name="robots"]'),
  };
}

function htmlToMarkdown(html) {
  if (!html) return '';
  const cleaned = html
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:figure|div)[^>]*>/g, '');
  return turndown.turndown(cleaned).trim();
}

function cleanExcerpt(s) {
  return s
    .replace(/\s*\[?…\]?\s*Read more\s*$/i, '')
    .replace(/\s*\[\.\.\.\]\s*$/i, '')
    .trim();
}

function buildFrontmatter(fields) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${escapeYaml(item)}`);
      }
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${escapeYaml(v)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

async function extractPages() {
  console.log('\n=== PAGES ===');
  const pages = await fetchJson(`${WP_BASE}/wp-json/wp/v2/pages?per_page=50&_fields=id,slug,link,title,content`);
  console.log(`Found ${pages.length} pages.`);

  for (const page of pages) {
    const newSlug = SLUG_REMAP[page.slug] || page.slug;
    const filename = `${newSlug}.md`;
    const head = await fetchHead(page.link);
    const noindex = head.robots?.includes('noindex') ?? false;
    const title = decodeEntities(page.title.rendered);
    const description = head.description || `${title} — Jitsu-Do Karate + BJJ in Newmarket, Ontario.`;

    const fm = buildFrontmatter({
      title,
      description,
      ogImage: head.ogImage || undefined,
      noindex: noindex || undefined,
    });

    const body = htmlToMarkdown(page.content.rendered);
    const file = fm + body + '\n';

    const path = resolve(PAGES_DIR, filename);
    await writeFile(path, file, 'utf8');
    console.log(`  ✓ ${page.slug} → pages/${filename}`);
  }
}

async function extractPosts() {
  console.log('\n=== POSTS ===');
  const posts = await fetchJson(`${WP_BASE}/wp-json/wp/v2/posts?per_page=50&_embed=wp:featuredmedia,wp:term&_fields=id,slug,link,title,content,excerpt,date,featured_media,_embedded`);
  console.log(`Found ${posts.length} posts.`);

  for (const post of posts) {
    const head = await fetchHead(post.link);
    const title = decodeEntities(post.title.rendered);
    const excerpt = cleanExcerpt(decodeEntities(post.excerpt.rendered.replace(/<[^>]+>/g, '')));
    const featured = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    const tags = (post._embedded?.['wp:term']?.flat() || [])
      .filter((t) => t.taxonomy === 'post_tag' || t.taxonomy === 'category')
      .map((t) => t.name);

    const fm = buildFrontmatter({
      title,
      date: post.date.split('T')[0],
      excerpt: excerpt || head.description || `${title}.`,
      featuredImage: featured || '/images/placeholder.jpg',
      seoTitle: head.title && head.title !== title ? head.title : undefined,
      seoDescription: head.description || undefined,
      tags,
      draft: false,
    });

    const body = htmlToMarkdown(post.content.rendered);
    const file = fm + body + '\n';

    const path = resolve(POSTS_DIR, `${post.slug}.md`);
    await writeFile(path, file, 'utf8');
    console.log(`  ✓ ${post.slug} → posts/${post.slug}.md`);
  }
}

async function main() {
  console.log('Extracting from', WP_BASE);
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(POSTS_DIR, { recursive: true });
  await extractPages();
  await extractPosts();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
