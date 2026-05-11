'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [7, 14, 30];

export function WindowSwitcher({ current }: { current: number }) {
  const router = useRouter();
  const search = useSearchParams();
  function set(value: number) {
    const params = new URLSearchParams(search);
    params.set('window', String(value));
    router.push(`/admin/analytics?${params.toString()}`);
  }
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border-strong">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => set(opt)}
          className={`h-9 px-3 text-sm font-medium transition-colors no-tap-highlight ${
            current === opt ? 'bg-primary text-on-primary' : 'bg-surface text-ink hover:bg-muted'
          }`}
          aria-pressed={current === opt}
        >
          {opt}d
        </button>
      ))}
    </div>
  );
}
