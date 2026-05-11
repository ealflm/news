import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import {
  Eye,
  MousePointerClick,
  FileText,
  TrendingUp,
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getAnalyticsOverview } from '@/lib/analytics';
import { AnalyticsChart } from './analytics/analytics-chart';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function getMe(): Promise<{ email: string; displayName: string } | null> {
  const cookie = (await cookies()).get('access_token');
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `access_token=${cookie.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as { email: string; displayName: string };
}

const SHORTCUTS = [
  { href: '/admin/posts/new' as Route, label: 'Tạo bài viết mới', Icon: FileText },
  { href: '/admin/media' as Route, label: 'Quản lý media', Icon: ImageIcon },
  { href: '/admin/popups/new' as Route, label: 'Tạo popup mới', Icon: Sparkles },
  { href: '/admin/analytics' as Route, label: 'Analytics chi tiết', Icon: BarChart3 },
];

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const me = await getMe();
  const overview = await getAnalyticsOverview(7);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Xin chào, {me?.displayName ?? '...'} — đây là tổng quan 7 ngày gần nhất.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Tổng bài"
          value={overview.kpis.posts.total}
          sub={`Published: ${overview.kpis.posts.published}`}
          Icon={FileText}
        />
        <KpiCard
          label="Lượt xem"
          value={overview.kpis.views.total}
          delta={overview.kpis.views.deltaPercent}
          Icon={Eye}
        />
        <KpiCard
          label="Click affiliate"
          value={overview.kpis.clicks.total}
          delta={overview.kpis.clicks.deltaPercent}
          Icon={MousePointerClick}
        />
        <KpiCard
          label="CTR"
          value={`${overview.kpis.ctr.value}%`}
          delta={overview.kpis.ctr.deltaPercent}
          Icon={TrendingUp}
        />
      </section>

      {/* Time series */}
      <section className="mt-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Views &amp; Clicks (7 ngày)
            </h2>
            <Link
              href={'/admin/analytics' as Route}
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Xem chi tiết <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="h-72 w-full">
            <AnalyticsChart series={overview.series} />
          </div>
        </Card>
      </section>

      {/* Top posts + Top popups */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Top bài viết</h2>
          {overview.topPosts.length === 0 ? (
            <p className="text-sm text-muted-fg">Chưa có dữ liệu.</p>
          ) : (
            <ol className="space-y-2">
              {overview.topPosts.slice(0, 5).map((p, i) => (
                <li key={p.postId} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-heading font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium text-ink">{p.title}</span>
                  <span className="tabular-nums text-muted-fg">
                    {new Intl.NumberFormat('vi-VN').format(p.views)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Top popup (CTR)</h2>
          {overview.topPopups.length === 0 ? (
            <p className="text-sm text-muted-fg">Chưa có dữ liệu.</p>
          ) : (
            <ol className="space-y-2">
              {overview.topPopups.slice(0, 5).map((p, i) => (
                <li key={p.popupId} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-heading font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium text-ink">{p.name}</span>
                  <span className="tabular-nums text-accent">{(p.ctr * 100).toFixed(2)}%</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>

      {/* Shortcuts */}
      <section className="mt-8">
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Lối tắt</h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary hover:bg-muted no-tap-highlight"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="flex-1 font-medium text-ink transition-colors group-hover:text-primary">
                  {label}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-muted-fg transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  Icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  delta?: number;
  Icon: typeof Eye;
}) {
  const trendUp = (delta ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">{label}</p>
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-3 font-heading text-2xl font-bold tabular-nums text-foreground">
        {typeof value === 'number' ? new Intl.NumberFormat('vi-VN').format(value) : value}
      </p>
      {delta !== undefined && (
        <p className={`mt-1 text-xs ${trendUp ? 'text-success' : 'text-destructive'}`}>
          {trendUp ? '▲' : '▼'} {Math.abs(delta)}%
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-muted-fg">{sub}</p>}
    </Card>
  );
}
