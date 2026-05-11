'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Total duration in minutes. */
  value: number;
  onChange: (minutes: number) => void;
  /** Min total minutes (default 0). */
  min?: number;
  /** Max total minutes (default 365 days). */
  max?: number;
}

interface Parts {
  d: number;
  h: number;
  m: number;
}

function fromMinutes(total: number): Parts {
  const safe = Math.max(0, Math.floor(total));
  return {
    d: Math.floor(safe / 1440),
    h: Math.floor((safe % 1440) / 60),
    m: safe % 60,
  };
}

function toMinutes(p: Parts): number {
  return p.d * 1440 + p.h * 60 + p.m;
}

/**
 * Three-field duration input: days / hours / minutes. Computes a single
 * minute value via onChange. Bounds applied on commit (blur).
 */
export function DurationInput({ value, onChange, min = 0, max = 365 * 1440 }: Props) {
  const [parts, setParts] = useState<Parts>(() => fromMinutes(value));

  // Sync external changes
  useEffect(() => {
    setParts(fromMinutes(value));
  }, [value]);

  function commit(next: Parts) {
    const total = Math.max(min, Math.min(max, toMinutes(next)));
    onChange(total);
  }

  function patch(p: Partial<Parts>) {
    const next = { ...parts, ...p };
    setParts(next);
    commit(next);
  }

  return (
    <div className="flex items-center gap-2">
      <Field label="Ngày" value={parts.d} max={365} onChange={(d) => patch({ d })} />
      <Field label="Giờ" value={parts.h} max={23} onChange={(h) => patch({ h })} />
      <Field label="Phút" value={parts.m} max={59} onChange={(m) => patch({ m })} />
    </div>
  );
}

function Field({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-fg">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0);
        }}
        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-center text-sm text-ink tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
