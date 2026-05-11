'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Loader2, Search, X } from 'lucide-react';

interface Props {
  initialQ: string;
  initialStatus: string;
}

const DEBOUNCE_MS = 300;

export function PostsFilter({ initialQ, initialStatus }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build URL from current values + push to router
  function apply(nextQ: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextStatus) params.set('status', nextStatus);
    const queryString = params.toString();
    const url = `/admin/posts${queryString ? `?${queryString}` : ''}` as Route;
    startTransition(() => {
      router.replace(url);
    });
  }

  // Debounce text input
  useEffect(() => {
    if (q === initialQ) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      apply(q, status);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Status change applies immediately
  function onStatusChange(next: string) {
    setStatus(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    apply(q, next);
  }

  function clearQuery() {
    setQ('');
    if (timerRef.current) clearTimeout(timerRef.current);
    apply('', status);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tiêu đề/slug…"
          aria-label="Tìm bài viết"
          className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {pending ? (
          <Loader2
            className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-fg"
            aria-label="Đang lọc"
          />
        ) : q ? (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Xóa tìm kiếm"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Lọc theo trạng thái"
        className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="DRAFT">Draft</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="PUBLISHED">Published</option>
      </select>
    </div>
  );
}
