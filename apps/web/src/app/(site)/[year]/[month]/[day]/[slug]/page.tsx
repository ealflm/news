import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { Calendar, Eye, User } from 'lucide-react';
import { getPublishedPostBySlug } from '@/lib/posts';
import { getPopupBundleBase64 } from '@/lib/popups';
import { ViewTracker } from '@/components/site/view-tracker';
import { CopyUrlButton } from '@/components/ui/copy-url-button';

export const revalidate = 300;

// [year]/[month]/[day]/[slug] otherwise matches any 4-segment path (e.g.
// /admin/popups/{id}/something), so reject non-date-shaped segments first.
function isDateShape(year: string, month: string, day: string): boolean {
  return /^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}): Promise<Metadata> {
  const { year, month, day, slug } = await params;
  if (!isDateShape(year, month, day)) return { title: 'Không tìm thấy' };
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
  if (!isDateShape(year, month, day)) notFound();
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
    <div className="bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link href={'/' as Route} className="text-sm font-medium text-accent hover:underline">
            ← Trang chủ
          </Link>
        </nav>

        <header className="mb-8 border-b border-border pb-8">
          <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 font-heading text-lg leading-relaxed text-muted-fg sm:text-xl">
              {post.excerpt}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-fg">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden="true" />
              {post.author.displayName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {new Date(post.publishedAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {new Intl.NumberFormat('vi-VN').format(post.viewCount)} lượt xem
            </span>
            <CopyUrlButton
              path={`/${year}/${month}/${day}/${slug}`}
              size="sm"
              showLabel
              label="Sao chép URL"
              className="ml-auto"
            />
          </div>
        </header>

        {post.coverImageUrl && (
          <figure className="mb-8 -mx-4 sm:mx-0">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="aspect-[16/9] w-full object-cover sm:rounded-lg"
            />
          </figure>
        )}

        <div className="prose-news" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </article>

      {popupBase64 && <script async src={`data:text/javascript;base64,${popupBase64}`} />}
      <ViewTracker postId={post.id} />
    </div>
  );
}
