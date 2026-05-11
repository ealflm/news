import type { AnalyticsReferrer } from '@news/shared';

export function ReferrerTable({ data }: { data: AnalyticsReferrer[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-fg">Chưa có dữ liệu referrer.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-fg">
          <th className="py-2">Nguồn</th>
          <th className="py-2 text-right">Lượt xem</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.referrer} className="border-b border-border last:border-0">
            <td className="py-2 text-ink">{r.referrer}</td>
            <td className="py-2 text-right tabular-nums text-foreground">
              {new Intl.NumberFormat('vi-VN').format(r.views)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
