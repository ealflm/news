'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsTimeSeriesPoint } from '@news/shared';

interface Props {
  series: AnalyticsTimeSeriesPoint[];
}

export function AnalyticsChart({ series }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={(d: string) => d.slice(5)}
          stroke="#64748B"
          fontSize={11}
        />
        <YAxis stroke="#64748B" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#1E3A8A', fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="views"
          name="Views"
          stroke="#2563EB"
          fill="url(#viewsGrad)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          name="Clicks"
          stroke="#0EA5E9"
          fill="url(#clicksGrad)"
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
