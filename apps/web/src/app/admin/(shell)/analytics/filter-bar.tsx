'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';

const PRESETS: { label: string; value: string }[] = [
  { label: 'Hôm nay', value: '1' },
  { label: '7 ngày', value: '7' },
  { label: '14 ngày', value: '14' },
  { label: '30 ngày', value: '30' },
  { label: '90 ngày', value: '90' },
];

interface Props {
  preset: string;
  granularity: string;
  device: string;
}

export function FilterBar({ preset, granularity, device }: Props) {
  const router = useRouter();
  const search = useSearchParams();

  function set(name: string, value: string) {
    const p = new URLSearchParams(search);
    if (value) p.set(name, value);
    else p.delete(name);
    router.push(`/admin/analytics?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-fg">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        Khoảng:
      </div>
      <div className="inline-flex overflow-hidden rounded-md border border-border-strong">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => set('preset', p.value)}
            aria-pressed={preset === p.value}
            className={cn(
              'h-9 px-3 text-sm font-medium transition-colors no-tap-highlight',
              preset === p.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-ink hover:bg-muted',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <select
        value={granularity}
        onChange={(e) => set('gran', e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink"
        aria-label="Granularity"
      >
        <option value="day">Theo ngày</option>
        <option value="week">Theo tuần</option>
        <option value="month">Theo tháng</option>
      </select>

      <select
        value={device}
        onChange={(e) => set('device', e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink"
        aria-label="Device"
      >
        <option value="">Tất cả thiết bị</option>
        <option value="ios">iOS</option>
        <option value="android">Android</option>
        <option value="desktop">Desktop</option>
      </select>
    </div>
  );
}
