import Link from 'next/link';
import type { Route } from 'next';
import { Globe2, Plus, Sparkles } from 'lucide-react';
import { listPopups } from '@/lib/popups';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '0m';
}

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
}

export default async function AdminPopupsPage() {
  const popups = await listPopups();
  const totalEnabled = popups.filter((p) => p.enabled).length;
  const totalGlobal = popups.filter((p) => p.isGlobal).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Popups</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Banner affiliate gắn vào bài viết —{' '}
            <span className="font-medium text-ink">{totalEnabled}</span> đang bật ·{' '}
            <span className="font-medium text-ink">{totalGlobal}</span> global trên tổng{' '}
            {popups.length}.
          </p>
        </div>
        <Link
          href={'/admin/popups/new' as Route}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 no-tap-highlight"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo popup
        </Link>
      </div>

      {popups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Chưa có popup nào</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-fg">
            Tạo popup đầu tiên để kéo affiliate traffic từ bài viết sang Shopee / TikTok / Lazada.
          </p>
          <Link
            href={'/admin/popups/new' as Route}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 no-tap-highlight"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo popup đầu tiên
          </Link>
        </Card>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {popups.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/popups/${p.id}/edit` as Route}
                className="group block overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong no-tap-highlight"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {p.bannerUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.bannerUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-fg">
                      <Sparkles className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                  {/* Status pills */}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    <span
                      className={`inline-flex h-5 items-center rounded-pill px-2 text-[10px] font-semibold uppercase tracking-wide ${
                        p.enabled
                          ? 'bg-success/90 text-white'
                          : 'border border-border bg-muted text-muted-fg'
                      }`}
                    >
                      {p.enabled ? 'ON' : 'OFF'}
                    </span>
                    {p.isGlobal && (
                      <span className="inline-flex h-5 items-center gap-0.5 rounded-pill bg-accent/90 px-2 text-[10px] font-semibold uppercase tracking-wide text-white">
                        <Globe2 className="h-2.5 w-2.5" aria-hidden="true" />
                        Global
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="font-heading text-base font-semibold leading-snug text-ink transition-colors group-hover:text-primary line-clamp-1">
                    {p.name}
                  </h2>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-fg">{p.cookieKey}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <dt className="text-muted-fg">Delay</dt>
                      <dd className="font-medium text-ink tabular-nums">
                        {formatDelay(p.delayMs)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-fg">Cookie</dt>
                      <dd className="font-medium text-ink tabular-nums">
                        {formatDuration(p.cookieTtlMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-fg">Links</dt>
                      <dd className="font-medium text-ink tabular-nums">{p.links.length}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
