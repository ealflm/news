'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { AuditLogItem } from '@news/shared';
import { Card } from '@/components/ui/card';

const ACTION_LABEL: Record<string, string> = {
  'post.create': 'Tạo bài',
  'post.update': 'Sửa bài',
  'post.publish': 'Xuất bản',
  'post.unpublish': 'Bỏ xuất bản',
  'post.delete': 'Xóa bài',
};

const ACTION_OPTIONS = [
  { value: '', label: 'Mọi hành động' },
  { value: 'post.create', label: 'Tạo bài' },
  { value: 'post.update', label: 'Sửa bài' },
  { value: 'post.publish', label: 'Xuất bản' },
  { value: 'post.unpublish', label: 'Bỏ xuất bản' },
  { value: 'post.delete', label: 'Xóa bài' },
];

const TARGET_OPTIONS = [
  { value: '', label: 'Mọi loại' },
  { value: 'Post', label: 'Post' },
  { value: 'User', label: 'User' },
  { value: 'Popup', label: 'Popup' },
  { value: 'Media', label: 'Media' },
];

const PAGE_LIMIT = 50;

interface Filters {
  actorUsername: string;
  action: string;
  targetType: string;
}

export function AuditClient() {
  const [filters, setFilters] = useState<Filters>({
    actorUsername: '',
    action: '',
    targetType: '',
  });
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const fetchPage = useCallback(
    async (current: Filters, nextCursor: string | null, append: boolean) => {
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));
        if (nextCursor) params.set('cursor', nextCursor);
        if (current.actorUsername.trim()) params.set('actorUsername', current.actorUsername.trim());
        if (current.action) params.set('action', current.action);
        if (current.targetType) params.set('targetType', current.targetType);
        const r = await fetch(`/api/audit?${params}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          items: AuditLogItem[];
          nextCursor: string | null;
        };
        if (reqIdRef.current !== reqId) return; // stale
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setCursor(data.nextCursor);
      } catch (err) {
        if (reqIdRef.current !== reqId) return;
        setError(err instanceof Error ? err.message : 'load failed');
      } finally {
        if (reqIdRef.current === reqId) setLoading(false);
      }
    },
    [],
  );

  // First load + filter change → debounce (text fields slow, selects instant)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPage(filters, null, false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchPage]);

  function patch(p: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...p }));
  }

  function clearFilters() {
    setFilters({ actorUsername: '', action: '', targetType: '' });
  }

  const hasActiveFilter = Boolean(filters.actorUsername || filters.action || filters.targetType);

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.actorUsername}
            onChange={(e) => patch({ actorUsername: e.target.value })}
            placeholder="Lọc theo @username…"
            aria-label="Lọc theo username"
            className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {loading && (
            <Loader2
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-fg"
              aria-label="Đang tải"
            />
          )}
        </div>
        <select
          value={filters.action}
          onChange={(e) => patch({ action: e.target.value })}
          aria-label="Lọc theo hành động"
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.targetType}
          onChange={(e) => patch({ targetType: e.target.value })}
          aria-label="Lọc theo loại"
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {TARGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Xóa lọc
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Không tải được audit log: {error}
        </div>
      )}

      {/* List */}
      <Card className="divide-y divide-border">
        {items.length === 0 && !loading ? (
          <p className="p-6 text-sm text-muted-fg">
            {hasActiveFilter ? 'Không có entry nào khớp bộ lọc.' : 'Chưa có hoạt động nào.'}
          </p>
        ) : (
          items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                {ACTION_LABEL[i.action] ?? i.action}
              </span>
              <span className="truncate text-ink">
                {i.actorUsername ? `@${i.actorUsername}` : 'system'}
              </span>
              <span className="text-muted-fg">·</span>
              <span className="truncate text-muted-fg">
                {i.targetType}
                {i.targetId ? ` #${i.targetId.slice(0, 8)}` : ''}
              </span>
              {i.meta != null &&
              typeof i.meta === 'object' &&
              'title' in (i.meta as Record<string, unknown>) ? (
                <span className="truncate text-muted-fg">
                  — {(i.meta as { title: string }).title}
                </span>
              ) : null}
              <span className="ml-auto text-xs text-muted-fg">
                {new Date(i.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          ))
        )}
      </Card>

      {/* Load more */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-fg">
        <span className="tabular-nums">{items.length} entry</span>
        {cursor && (
          <button
            type="button"
            onClick={() => void fetchPage(filters, cursor, true)}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 no-tap-highlight"
          >
            {loading ? 'Đang tải…' : 'Tải thêm'}
          </button>
        )}
      </div>
    </>
  );
}
