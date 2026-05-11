import Link from 'next/link';
import type { Route } from 'next';
import type { Metadata } from 'next';
import { Calendar, ChevronRight, Search } from 'lucide-react';
import { listPublishedPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q?.trim();
  return {
    title: q ? `Kết quả cho "${q}"` : 'Tìm kiếm',
    description: q
      ? `Bài viết khớp với từ khóa "${q}".`
      : 'Tìm bài viết theo tiêu đề hoặc nội dung.',
    robots: q ? { index: false, follow: true } : undefined,
  };
}

function postUrl(p: { publishedAt: string | null; slug: string }): Route {
  if (!p.publishedAt) return '/' as Route;
  const d = new Date(p.publishedAt);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `/${yyyy}/${mm}/${dd}/${p.slug}` as Route;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const cursor = sp.cursor;

  const data = await listPublishedPosts({
    limit: 20,
    ...(q ? { q } : {}),
    ...(cursor ? { cursor } : {}),
  });
  const posts = data.items;
  const hasQuery = q.length > 0;

  // Build "load more" URL preserving q
  const moreHref = data.nextCursor
    ? (`/tim-kiem?${new URLSearchParams({
        ...(q ? { q } : {}),
        cursor: data.nextCursor,
      }).toString()}` as Route)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Tìm kiếm</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Nhập từ khóa để tìm trong tiêu đề, mô tả hoặc slug.
        </p>
      </header>

      {/* Search form */}
      <form
        action="/tim-kiem"
        method="get"
        role="search"
        className="mb-6 flex flex-wrap items-center gap-2 sm:flex-nowrap"
      >
        <label htmlFor="q" className="sr-only">
          Từ khóa
        </label>
        <div className="relative w-full flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
            aria-hidden="true"
          />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus={!q}
            placeholder="Ví dụ: chợ đầu mối, drama, hàng hot…"
            maxLength={100}
            className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-base text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-on-primary hover:bg-primary/90 no-tap-highlight"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Tìm
        </button>
      </form>

      {/* Results header */}
      {hasQuery && (
        <p className="mb-4 text-sm text-muted-fg">
          {posts.length === 0 ? (
            <>
              Không có kết quả cho <span className="font-medium text-ink">"{q}"</span>.
            </>
          ) : (
            <>
              <span className="font-medium text-ink">{posts.length}</span>
              {data.nextCursor ? '+' : ''} kết quả cho{' '}
              <span className="font-medium text-ink">"{q}"</span>
            </>
          )}
        </p>
      )}
      {!hasQuery && (
        <p className="mb-4 text-sm text-muted-fg">
          Hoặc duyệt <span className="font-medium text-ink">{posts.length}</span> bài mới nhất dưới
          đây.
        </p>
      )}

      {/* Results */}
      {posts.length === 0 ? (
        hasQuery ? (
          <NoResults q={q} />
        ) : (
          <div className="rounded-md border border-border bg-surface p-10 text-center text-sm text-muted-fg">
            Chưa có bài viết nào.
          </div>
        )
      ) : (
        <ul role="list" className="space-y-4">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={postUrl(p)}
                className="group flex gap-4 overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong no-tap-highlight sm:p-5"
              >
                {p.coverImageUrl ? (
                  <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.coverImageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="hidden h-24 w-32 shrink-0 items-center justify-center rounded-md bg-muted sm:flex">
                    <Search className="h-5 w-5 text-muted-fg/60" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-primary sm:text-xl">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-fg">{p.excerpt}</p>
                  )}
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-fg">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(p.publishedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {moreHref && (
        <div className="mt-6 flex justify-center">
          <Link
            href={moreHref}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted no-tap-highlight"
          >
            Tải thêm
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-fg">
        <Search className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Không có kết quả cho "{q}"
      </h2>
      <p className="mt-1 text-sm text-muted-fg">
        Thử từ khóa ngắn hơn, hoặc kiểm tra lại chính tả.
      </p>
      <Link
        href={'/tim-kiem' as Route}
        className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
      >
        Quay lại trang tìm kiếm
      </Link>
    </div>
  );
}
