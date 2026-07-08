// Server-only module: uses Node.js `fs` and `path` — never runs in the browser.
// A Server Component can import this directly because it stays on the server.
// If a Client Component ever tried to import it, the `server-only` package
// (used in session.ts) would throw at build time — we omit it here because
// the topic pages are straightforwardly static Server Components with no
// risk of client import.
//
// This file is the "service layer" for topic content: read, parse, expose.
// In Angular terms it's a service with no constructor injection — just
// plain async functions imported directly.

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const TOPICS_DIR = path.join(process.cwd(), 'src/content/topics');

export type TopicMeta = {
  slug: string;
  title: string;
  description: string;
  order: number;
};

export type Topic = TopicMeta & {
  html: string;
};

// Read all .md files, parse frontmatter only (cheap — no markdown rendering).
// Used by the index page and generateStaticParams.
export async function getAllTopicMeta(): Promise<TopicMeta[]> {
  const files = await fs.readdir(TOPICS_DIR);
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith('.md'))
      .map(async (file) => {
        const slug = file.replace(/\.md$/, '');
        const raw = await fs.readFile(path.join(TOPICS_DIR, file), 'utf-8');
        const { data } = matter(raw);
        return {
          slug,
          title: data.title as string,
          description: data.description as string,
          order: (data.order as number) ?? 99,
        };
      }),
  );
  return metas.sort((a, b) => a.order - b.order);
}

// Read one .md file, parse frontmatter + render markdown → HTML.
// Returns null when the slug doesn't match any file (caller calls notFound()).
export async function getTopic(slug: string): Promise<Topic | null> {
  try {
    const raw = await fs.readFile(
      path.join(TOPICS_DIR, `${slug}.md`),
      'utf-8',
    );
    const { data, content } = matter(raw);
    // marked() converts markdown to an HTML string.
    // dangerouslySetInnerHTML in the page is safe here because the source
    // is files we control in the repo — not user-supplied input.
    const html = await marked(content);
    return {
      slug,
      title: data.title as string,
      description: data.description as string,
      order: (data.order as number) ?? 99,
      html,
    };
  } catch {
    return null;
  }
}
