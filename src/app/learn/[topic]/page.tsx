// Server Component: reads a markdown file from the filesystem and renders it.
// No API route needed — Server Components have direct access to Node.js APIs
// (fs, path) via the topics utility. The file read happens at BUILD TIME for
// the pre-rendered pages, and at REQUEST TIME for any slug not in
// generateStaticParams (dynamicParams = true, the default).
//
// This page ties together four already-learned concepts in one place:
//   - generateStaticParams  → pre-renders all topic pages as static HTML (●)
//   - generateMetadata      → title/description from the file's frontmatter
//   - notFound()            → 404 for unknown slugs
//   - dangerouslySetInnerHTML → safe here because the source is our own files

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllTopicMeta, getTopic } from '@/lib/topics';
import styles from './page.module.css';

export async function generateStaticParams() {
  const topics = await getAllTopicMeta();
  return topics.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const data = await getTopic(topic);
  if (!data) return {};
  return { title: data.title, description: data.description };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const data = await getTopic(topic);
  if (!data) notFound();

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/learn">← Learn</Link>
      </nav>
      <article
        className={styles.prose}
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    </main>
  );
}
