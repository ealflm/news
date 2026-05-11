'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { AnalyticsByPlatform } from '@news/shared';

const COLORS: Record<string, string> = {
  SHOPEE: '#EE4D2D',
  TIKTOK: '#0F172A',
  LAZADA: '#0369A1',
  OTHER: '#64748B',
};

export function PlatformBars({ data }: { data: AnalyticsByPlatform[] }) {
  if (data.every((d) => d.clicks === 0)) {
    return <p className="text-sm text-muted-fg">Chưa có click nào.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <XAxis type="number" stroke="#64748B" fontSize={11} />
        <YAxis type="category" dataKey="platform" stroke="#64748B" fontSize={11} width={80} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="clicks" isAnimationActive={false} radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLORS[d.platform] ?? '#64748B'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
