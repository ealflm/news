import Link from 'next/link';
import type { Route } from 'next';
import { listPublishedPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

function postUrl(p: { publishedAt: string | null; slug: string }): Route {
  if (!p.publishedAt) return '/' as Route;
  const d = new Date(p.publishedAt);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `/${yyyy}/${mm}/${dd}/${p.slug}` as Route;
}

export default async function HomePage() {
  const data = await listPublishedPosts({ limit: 12 });
  const posts = data.items;
  const [featured, ...rest] = posts;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href={'/' as Route} className="text-xl font-bold">
          News
        </Link>
        <Link href={'/admin' as Route} className="text-sm text-gray-500 hover:text-gray-900">
          Admin
        </Link>
      </header>

      {featured ? (
        <section className="mb-10">
          <Link href={postUrl(featured)} className="block overflow-hidden rounded-lg bg-gray-100">
            {featured.coverImageUrl && (
              <img
                src={featured.coverImageUrl}
                alt={featured.title}
                className="h-80 w-full object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-3xl font-bold">{featured.title}</h2>
              {featured.excerpt && <p className="mt-2 text-gray-600">{featured.excerpt}</p>}
              <p className="mt-3 text-xs text-gray-500">
                {featured.publishedAt && new Date(featured.publishedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </Link>
        </section>
      ) : (
        <p className="mb-10 text-gray-500">Chưa có bài viết nào.</p>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {rest.map((p) => (
          <Link
            key={p.id}
            href={postUrl(p)}
            className="block overflow-hidden rounded-lg border bg-white"
          >
            {p.coverImageUrl && (
              <img src={p.coverImageUrl} alt={p.title} className="h-44 w-full object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-semibold">{p.title}</h3>
              {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.excerpt}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {p.publishedAt && new Date(p.publishedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
