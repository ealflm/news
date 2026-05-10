import Link from 'next/link';
import type { Route } from 'next';
import { listPopups } from '@/lib/popups';

export const dynamic = 'force-dynamic';

export default async function AdminPopupsPage() {
  const popups = await listPopups();
  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Popups</h1>
        <Link
          href={'/admin/popups/new' as Route}
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + Tạo popup
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="px-2 py-2">Tên</th>
            <th className="px-2 py-2">Cookie key</th>
            <th className="px-2 py-2">Delay</th>
            <th className="px-2 py-2">Global</th>
            <th className="px-2 py-2">Bật</th>
            <th className="px-2 py-2">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {popups.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2">
                <Link
                  href={`/admin/popups/${p.id}/edit` as Route}
                  className="font-medium text-blue-700"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-2 py-2 text-gray-500">{p.cookieKey}</td>
              <td className="px-2 py-2">{p.delayMs}ms</td>
              <td className="px-2 py-2">{p.isGlobal ? '✓' : '—'}</td>
              <td className="px-2 py-2">{p.enabled ? '●' : '○'}</td>
              <td className="px-2 py-2 text-gray-500">
                {new Date(p.updatedAt).toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
