import type { AnalyticsFunnel } from '@news/shared';

export function FunnelCard({ data }: { data: AnalyticsFunnel }) {
  const stages = [
    { label: 'Lượt xem', value: data.views, color: 'bg-primary' },
    { label: 'Mobile (popup eligible)', value: data.eligible, color: 'bg-accent' },
    { label: 'Click affiliate', value: data.clicks, color: 'bg-secondary' },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const width = max > 0 ? Math.round((s.value / max) * 100) : 0;
        const prev = i > 0 ? stages[i - 1]!.value : null;
        const rate = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-ink">{s.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {new Intl.NumberFormat('vi-VN').format(s.value)}
                {rate !== null && <span className="ml-2 text-xs text-muted-fg">({rate}%)</span>}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${s.color} transition-all duration-300`}
                style={{ width: `${Math.max(width, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
