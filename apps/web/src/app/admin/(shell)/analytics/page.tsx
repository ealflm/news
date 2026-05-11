import {
  Eye,
  MousePointerClick,
  FileText,
  TrendingUp,
  Download,
  Smartphone,
  Globe,
  Clock,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  getAnalyticsOverview,
  getByDevice,
  getByPlatform,
  getByHour,
  getFunnel,
  getTopReferrers,
} from '@/lib/analytics';
import { AnalyticsChart } from './analytics-chart';
import { DeviceDonut } from './device-donut';
import { PlatformBars } from './platform-bars';
import { HourlyBars } from './hourly-bars';
import { FunnelCard } from './funnel-card';
import { ReferrerTable } from './referrer-table';
import { FilterBar } from './filter-bar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ preset?: string; gran?: string; device?: string }>;
}

function parseRange(preset: string | undefined): {
  from: Date;
  to: Date;
  label: string;
  days: number;
} {
  const days = Math.max(1, Math.min(parseInt(preset ?? '7', 10) || 7, 365));
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400_000);
  return { from, to, label: `${days} ngày`, days };
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const preset = sp.preset ?? '7';
  const granularity = sp.gran ?? 'day';
  const device = sp.device ?? '';
  const { from, to, label, days } = parseRange(preset);

  const [overview, devices, platforms, hours, funnel, referrers] = await Promise.all([
    getAnalyticsOverview(days),
    getByDevice({ from, to }),
    getByPlatform({ from, to }),
    getByHour({ from, to }),
    getFunnel({ from, to }),
    getTopReferrers({ from, to }),
  ]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-fg">Số liệu {label}</p>
        </div>
        <a
          href={`${apiUrl}/api/analytics/export/posts.csv?window=${days}`}
          target="_blank"
          rel="noopener"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 text-sm font-medium text-foreground hover:bg-muted no-tap-highlight"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Xuất CSV
        </a>
      </div>

      <div className="mb-6">
        <FilterBar preset={preset} granularity={granularity} device={device} />
      </div>

      {/* KPI cards */}
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

      {/* Time series chart */}
      <section className="mt-6">
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
            Views &amp; Clicks ({label})
          </h2>
          <div className="h-72 w-full">
            <AnalyticsChart series={overview.series} />
          </div>
        </Card>
      </section>

      {/* Funnel + Device + Platform row */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" /> Phễu chuyển đổi
          </h2>
          <FunnelCard data={funnel} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" /> Theo thiết bị
          </h2>
          <DeviceDonut data={devices} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" /> Click theo nền tảng
          </h2>
          <PlatformBars data={platforms} />
        </Card>
      </section>

      {/* Hourly + Referrers row */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-semibold text-ink">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" /> Click theo giờ trong ngày
          </h2>
          <HourlyBars data={hours} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-ink">Nguồn truy cập</h2>
          <ReferrerTable data={referrers} />
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
              {overview.topPosts.map((p, i) => (
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
          {overview.topPopups.length === 0 ? (
            <p className="text-sm text-muted-fg">Chưa có dữ liệu.</p>
          ) : (
            <ol className="space-y-2">
              {overview.topPopups.map((p, i) => (
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
