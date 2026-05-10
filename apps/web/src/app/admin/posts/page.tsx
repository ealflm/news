import Link from 'next/link';
import type { Route } from 'next';
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
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bài viết</h1>
        <Link
          href={'/admin/posts/new' as Route}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + Tạo bài mới
        </Link>
      </div>

      <form className="mb-4 flex gap-2" action="/admin/posts">
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Tìm theo tiêu đề/slug..."
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <button type="submit" className="rounded border px-3 py-2 text-sm">
          Lọc
        </button>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="px-2 py-2">Tiêu đề</th>
            <th className="px-2 py-2">Slug</th>
            <th className="px-2 py-2">Trạng thái</th>
            <th className="px-2 py-2">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2">
                <Link
                  href={`/admin/posts/${p.id}/edit` as Route}
                  className="font-medium text-blue-700"
                >
                  {p.title}
                </Link>
              </td>
              <td className="px-2 py-2 text-gray-500">{p.slug}</td>
              <td className="px-2 py-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{p.status}</span>
              </td>
              <td className="px-2 py-2 text-gray-500">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleString('vi-VN') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.nextCursor && (
        <div className="mt-4">
          <Link
            href={
              `/admin/posts?cursor=${data.nextCursor}${sp.q ? `&q=${sp.q}` : ''}${
                sp.status ? `&status=${sp.status}` : ''
              }` as Route
            }
            className="text-sm text-blue-700"
          >
            Trang sau →
          </Link>
        </div>
      )}
    </main>
  );
}
