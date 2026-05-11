'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalyticsByHour } from '@news/shared';

export function HourlyBars({ data }: { data: AnalyticsByHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis
          dataKey="hour"
          stroke="#64748B"
          fontSize={11}
          tickFormatter={(h: number) => `${h}h`}
        />
        <YAxis stroke="#64748B" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(h) => `${h}:00`}
        />
        <Bar dataKey="clicks" fill="#0369A1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
