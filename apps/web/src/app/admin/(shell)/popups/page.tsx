import Link from 'next/link';
import type { Route } from 'next';
import { Plus } from 'lucide-react';
import { listPopups } from '@/lib/popups';

export const dynamic = 'force-dynamic';

export default async function AdminPopupsPage() {
  const popups = await listPopups();
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Popups</h1>
        <Link
          href={'/admin/popups/new' as Route}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 no-tap-highlight"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo popup
        </Link>
      </div>
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-ink">Tên</th>
              <th className="px-4 py-3 font-medium text-ink">Cookie key</th>
              <th className="px-4 py-3 font-medium text-ink">Delay</th>
              <th className="px-4 py-3 font-medium text-ink">Global</th>
              <th className="px-4 py-3 font-medium text-ink">Bật</th>
              <th className="px-4 py-3 font-medium text-ink">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {popups.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/popups/${p.id}/edit` as Route}
                    className="font-medium text-accent hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-fg">{p.cookieKey}</td>
                <td className="px-4 py-3 text-ink">{p.delayMs}ms</td>
                <td className="px-4 py-3 text-ink">{p.isGlobal ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-ink">{p.enabled ? '●' : '○'}</td>
                <td className="px-4 py-3 text-muted-fg">
                  {new Date(p.updatedAt).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
