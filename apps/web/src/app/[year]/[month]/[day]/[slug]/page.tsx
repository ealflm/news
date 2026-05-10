import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedPostBySlug } from '@/lib/posts';
import { getPopupBundleBase64 } from '@/lib/popups';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: 'Không tìm thấy' };

  const title = post.seoTitle ?? post.title;
  const description = post.seoDesc ?? post.excerpt ?? undefined;
  const ogImage = post.ogImageUrl ?? post.coverImageUrl;

  const meta: Metadata = { title };
  if (description) meta.description = description;

  const og: NonNullable<Metadata['openGraph']> = {
    title,
    type: 'article',
    publishedTime: post.publishedAt,
  };
  if (description) og.description = description;
  if (ogImage) og.images = [ogImage];
  meta.openGraph = og;

  return meta;
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

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author.displayName },
  };
  const description = post.seoDesc ?? post.excerpt;
  if (description) jsonLd.description = description;
  const image = post.ogImageUrl ?? post.coverImageUrl;
  if (image) jsonLd.image = image;

  const popupBase64 = await getPopupBundleBase64(post.id);

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
      {popupBase64 && <script async src={`data:text/javascript;base64,${popupBase64}`} />}
    </main>
  );
}
