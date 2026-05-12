import Link from 'next/link';
import type { Route } from 'next';
import { Calendar, ArrowRight } from 'lucide-react';
import { listPublishedPosts } from '@/lib/posts';

// Skip build-time prerender (API isn't reachable inside the build container).
// The fetch() inside listPublishedPosts still uses next.revalidate=60, so
// request-time renders are cheap.
export const dynamic = 'force-dynamic';

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

export default async function HomePage() {
  const data = await listPublishedPosts({ limit: 13 });
  const posts = data.items;
  const [featured, ...rest] = posts;
  const top = rest.slice(0, 3);
  const grid = rest.slice(3);

  if (!featured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="font-heading text-2xl font-bold text-foreground">Chưa có bài viết nào</p>
        <p className="mt-3 text-muted-fg">Hãy quay lại sau.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero featured */}
      <section className="grid gap-8 lg:grid-cols-3 lg:gap-10">
        <Link
          href={postUrl(featured)}
          className="group lg:col-span-2 no-tap-highlight"
          aria-label={featured.title}
        >
          <article className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong">
            {featured.coverImageUrl && (
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={featured.coverImageUrl}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="eager"
                />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <span className="inline-block rounded-pill bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-primary">
                Nổi bật
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-4xl">
                {featured.title}
              </h1>
              {featured.excerpt && (
                <p className="mt-3 line-clamp-3 text-base text-muted-fg">{featured.excerpt}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-fg">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDate(featured.publishedAt)}
                </span>
              </div>
            </div>
          </article>
        </Link>

        {/* Side: top 3 */}
        <aside className="space-y-4">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">
            Đọc nhiều
          </h2>
          <ol className="space-y-4">
            {top.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={postUrl(p)}
                  className="group flex gap-3 no-tap-highlight"
                  aria-label={p.title}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted font-heading text-base font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-base font-semibold leading-snug text-ink transition-colors group-hover:text-primary line-clamp-3">
                      {p.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-fg">{formatDate(p.publishedAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Grid */}
      {grid.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-heading text-2xl font-bold text-foreground">Bài mới</h2>
            <Link
              href={'/tim-kiem' as Route}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Xem tất cả
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((p) => (
              <li key={p.id}>
                <Link
                  href={postUrl(p)}
                  className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong no-tap-highlight h-full"
                >
                  {p.coverImageUrl && (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={p.coverImageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-primary line-clamp-2">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-fg">{p.excerpt}</p>
                    )}
                    <p className="mt-3 text-xs text-muted-fg">{formatDate(p.publishedAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
