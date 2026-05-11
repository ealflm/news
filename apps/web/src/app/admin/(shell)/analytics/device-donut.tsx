'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { AnalyticsByDevice } from '@news/shared';

const COLORS = ['#0369A1', '#0E7490', '#7DD3FC', '#94A3B8'];

const LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  desktop: 'Desktop',
  unknown: 'Khác',
};

export function DeviceDonut({ data }: { data: AnalyticsByDevice[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-fg">Chưa có dữ liệu device.</p>;
  }
  const chartData = data.map((d) => ({
    name: LABELS[d.device] ?? d.device,
    value: d.views,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length] ?? '#94A3B8'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
