import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    ogImage: z.string().optional(),
    noindex: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    featuredImage: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const instructors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/instructors' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    photo: z.string(),
    credentials: z.array(z.string()).default([]),
  }),
});

export const collections = { pages, posts, instructors };
