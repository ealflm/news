import { Eye, MousePointerClick, FileText, TrendingUp, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getAnalyticsOverview } from '@/lib/analytics';
import { AnalyticsChart } from './analytics-chart';
import { WindowSwitcher } from './window-switcher';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ window?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const windowDays = Math.min(Math.max(parseInt(sp.window ?? '7', 10) || 7, 1), 90);
  const data = await getAnalyticsOverview(windowDays);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-fg">Số liệu {windowDays} ngày gần nhất</p>
        </div>
        <div className="flex items-center gap-2">
          <WindowSwitcher current={windowDays} />
          <a
            href={`${apiUrl}/api/analytics/export/posts.csv?window=${windowDays}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 text-sm font-medium text-foreground hover:bg-muted no-tap-highlight"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Xuất CSV
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Tổng bài"
          value={data.kpis.posts.total}
          sub={`Published: ${data.kpis.posts.published}`}
          Icon={FileText}
        />
        <KpiCard
          label="Lượt xem"
          value={data.kpis.views.total}
          delta={data.kpis.views.deltaPercent}
          Icon={Eye}
        />
        <KpiCard
          label="Click affiliate"
          value={data.kpis.clicks.total}
          delta={data.kpis.clicks.deltaPercent}
          Icon={MousePointerClick}
        />
        <KpiCard
          label="CTR"
          value={`${data.kpis.ctr.value}%`}
          delta={data.kpis.ctr.deltaPercent}
          Icon={TrendingUp}
        />
      </section>

      {/* Chart */}
      <section className="mt-8">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
            Views &amp; Clicks ({windowDays} ngày)
          </h2>
          <div className="h-72 w-full">
            <AnalyticsChart series={data.series} />
          </div>
        </Card>
      </section>

      {/* Top posts + popups */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Top bài viết</h2>
          {data.topPosts.length === 0 ? (
            <p className="text-sm text-muted-fg">Chưa có dữ liệu.</p>
          ) : (
            <ol className="space-y-2">
              {data.topPosts.map((p, i) => (
                <li key={p.postId} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-heading font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium text-ink">{p.title}</span>
                  <span className="tabular-nums text-muted-fg">
                    {new Intl.NumberFormat('vi-VN').format(p.views)} views
                  </span>
                  <span className="tabular-nums text-accent">
                    {new Intl.NumberFormat('vi-VN').format(p.clicks)} clicks
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Top popup (CTR)</h2>
          {data.topPopups.length === 0 ? (
            <p className="text-sm text-muted-fg">Chưa có dữ liệu.</p>
          ) : (
            <ol className="space-y-2">
              {data.topPopups.map((p, i) => (
                <li key={p.popupId} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-heading font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium text-ink">{p.name}</span>
                  <span className="tabular-nums text-muted-fg">
                    {new Intl.NumberFormat('vi-VN').format(p.clicks)} clicks
                  </span>
                  <span className="tabular-nums text-accent">{(p.ctr * 100).toFixed(2)}%</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
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
