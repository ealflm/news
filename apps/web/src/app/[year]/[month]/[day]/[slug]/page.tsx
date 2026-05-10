import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedPostBySlug } from '@/lib/posts';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: 'Không tìm thấy' };
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDesc ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDesc ?? post.excerpt ?? undefined,
      type: 'article',
      images: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
      publishedTime: post.publishedAt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}) {
  const { year, month, day, slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const d = new Date(post.publishedAt);
  const expected = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
  if (expected !== `${year}/${month}/${day}`) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDesc ?? post.excerpt ?? undefined,
    image: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author.displayName },
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <h1 className="mb-4 text-4xl font-bold leading-tight">{post.title}</h1>
        <p className="mb-6 text-sm text-gray-500">
          ✍ {post.author.displayName} · 📅 {new Date(post.publishedAt).toLocaleDateString('vi-VN')}{' '}
          · 👁 {post.viewCount}
        </p>
        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mb-6 w-full rounded-lg object-cover"
          />
        )}
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </main>
  );
}
