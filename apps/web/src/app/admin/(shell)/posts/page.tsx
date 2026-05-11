import Link from 'next/link';
import type { Route } from 'next';
import { Plus } from 'lucide-react';
import { listAdminPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const sp = await searchParams;
  const query: { status?: string; q?: string; cursor?: string } = {};
  if (sp.status) query.status = sp.status;
  if (sp.q) query.q = sp.q;
  if (sp.cursor) query.cursor = sp.cursor;
  const data = await listAdminPosts(query);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Bài viết</h1>
        <Link
          href={'/admin/posts/new' as Route}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 no-tap-highlight"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài mới
        </Link>
      </div>

      <form className="mb-4 flex gap-2" action="/admin/posts">
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Tìm theo tiêu đề/slug..."
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-muted no-tap-highlight"
        >
          Lọc
        </button>
      </form>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-ink">Tiêu đề</th>
              <th className="px-4 py-3 font-medium text-ink">Slug</th>
              <th className="px-4 py-3 font-medium text-ink">Trạng thái</th>
              <th className="px-4 py-3 font-medium text-ink">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/posts/${p.id}/edit` as Route}
                    className="font-medium text-accent hover:underline"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-fg">{p.slug}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink">
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-fg">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleString('vi-VN') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.nextCursor && (
        <div className="mt-4">
          <Link
            href={
              `/admin/posts?cursor=${data.nextCursor}${sp.q ? `&q=${sp.q}` : ''}${
                sp.status ? `&status=${sp.status}` : ''
              }` as Route
            }
            className="text-sm font-medium text-accent hover:underline"
          >
            Trang sau →
          </Link>
        </div>
      )}
    </>
  );
}
