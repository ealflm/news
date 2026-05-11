'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  MonitorPlay,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { MediaListResponse, MediaRecord } from '@news/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { uploadMediaWithToast } from '@/components/ui/upload-toast';
import { cn } from '@/lib/cn';

interface UsagePost {
  id: string;
  title: string;
  slug: string;
  status: string;
  usedAs: 'cover' | 'content' | 'both';
}

interface DeleteBlocked {
  media: MediaRecord;
  posts: UsagePost[];
}

const PAGE_LIMIT = 40;

interface Props {
  apiUrl: string;
}

type Kind = 'IMAGE' | 'VIDEO';

const TABS: { value: Kind; label: string; Icon: typeof ImageIcon }[] = [
  { value: 'IMAGE', label: 'Ảnh', Icon: ImageIcon },
  { value: 'VIDEO', label: 'Video', Icon: MonitorPlay },
];

function pickThumb(m: MediaRecord, apiUrl: string): string | null {
  const v = (m.variants ?? null) as Record<string, string> | null;
  if (m.kind === 'VIDEO') {
    return v?.poster ? `${apiUrl}${v.poster}` : null;
  }
  const path = v?.['320w'] ?? v?.['720w'] ?? m.originalPath ?? null;
  return path ? `${apiUrl}${path}` : null;
}

function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaLibrary({ apiUrl }: Props) {
  const [kind, setKind] = useState<Kind>('IMAGE');
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchPage = useCallback(async (k: Kind, next: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('kind', k);
      params.set('limit', String(PAGE_LIMIT));
      if (next) params.set('cursor', next);
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MediaListResponse;
      setItems((prev) => (next ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset + fetch when kind changes
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setQuery('');
    void fetchPage(kind, null);
  }, [kind, fetchPage]);

  // `/` to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadPercent(0);
    setError(null);
    const res = await uploadMediaWithToast(file, { onPercent: setUploadPercent });
    setUploading(false);
    setUploadPercent(0);
    if (!res.ok || !res.media) {
      setError(`Upload thất bại (${res.status})`);
      return;
    }
    const m = res.media;
    // Auto-switch tab to match uploaded kind
    if (m.kind !== kind) {
      setKind(m.kind as Kind);
      // useEffect on kind change will reload list; no manual prepend.
    } else {
      setItems((prev) => [m, ...prev]);
    }
  }

  const [blocked, setBlocked] = useState<DeleteBlocked | null>(null);
  const [forceBusy, setForceBusy] = useState(false);

  async function deleteRequest(id: string, force = false): Promise<Response> {
    return fetch(`/api/media/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
  }

  const [pendingDelete, setPendingDelete] = useState<MediaRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function onDelete(id: string) {
    const m = items.find((x) => x.id === id);
    if (!m) return;
    setPendingDelete(m);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    const res = await deleteRequest(pendingDelete.id);
    setDeleteBusy(false);
    if (res.status === 204) {
      setItems((prev) => prev.filter((x) => x.id !== pendingDelete.id));
      toast.success(`Đã xóa ${pendingDelete.kind === 'VIDEO' ? 'video' : 'ảnh'}`);
      setPendingDelete(null);
      return;
    }
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        usages?: UsagePost[];
      } | null;
      const usages = body?.usages ?? [];
      setBlocked({ media: pendingDelete, posts: usages });
      setPendingDelete(null);
      return;
    }
    toast.error(`Xóa thất bại (${res.status})`);
    setPendingDelete(null);
  }

  async function forceDelete() {
    if (!blocked) return;
    setForceBusy(true);
    const res = await deleteRequest(blocked.media.id, true);
    setForceBusy(false);
    if (res.status === 204) {
      setItems((prev) => prev.filter((x) => x.id !== blocked.media.id));
      setBlocked(null);
      toast.success('Đã xóa media (ảnh trong các bài liên quan đã hỏng)');
      return;
    }
    toast.error(`Xóa thất bại (${res.status})`);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        (m.alt ?? '').toLowerCase().includes(q) || (m.mimeType ?? '').toLowerCase().includes(q),
    );
  }, [items, query]);

  const acceptAttr = kind === 'IMAGE' ? 'image/*' : 'video/*';
  const ActiveIcon = TABS.find((t) => t.value === kind)!.Icon;

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Thư viện media</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Ảnh và video tái dùng cho bài viết · soạn thảo và cover ảnh.
          </p>
        </div>
        <label
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 no-tap-highlight',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploading
            ? `Đang tải ${uploadPercent}%`
            : `Upload ${kind === 'IMAGE' ? 'ảnh' : 'video'}`}
          <input type="file" accept={acceptAttr} className="hidden" onChange={onUpload} />
        </label>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Loại media"
        className="mb-4 flex items-center gap-1 border-b border-border"
      >
        {TABS.map((t) => {
          const active = t.value === kind;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKind(t.value)}
              className={cn(
                'inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors no-tap-highlight',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-fg hover:text-ink',
              )}
            >
              <t.Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
              {active && (
                <span className="inline-flex h-5 items-center rounded-pill bg-muted px-2 text-[11px] font-semibold text-muted-fg tabular-nums">
                  {items.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Storage hint for video tab */}
      {kind === 'VIDEO' && (
        <div
          role="note"
          className="mb-4 flex items-start gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-ink"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">
              Khuyến nghị: upload video lên YouTube rồi nhúng vào bài
            </p>
            <p className="mt-0.5 text-xs text-muted-fg">
              Video tự host sẽ chiếm dung lượng ổ đĩa server và tăng tải bandwidth khi nhiều người
              xem. Dùng nút <span className="font-medium text-ink">Add → YouTube</span> trong editor
              để nhúng URL — server không cần lưu file.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar: search */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mô tả (alt) hoặc mime type…"
            aria-label="Tìm media"
            className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchRef.current?.focus();
              }}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {query && (
          <div className="text-xs text-muted-fg">
            <span className="font-medium text-ink tabular-nums">{filtered.length}</span> /{' '}
            {items.length}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Body */}
      {items.length === 0 && !loading ? (
        <EmptyState
          kind={kind}
          ActiveIcon={ActiveIcon}
          onUpload={onUpload}
          acceptAttr={acceptAttr}
          uploading={uploading}
          uploadPercent={uploadPercent}
        />
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-fg">
          Không có {kind === 'IMAGE' ? 'ảnh' : 'video'} nào khớp với "{query}".
        </Card>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {filtered.map((m) => {
            const thumb = pickThumb(m, apiUrl);
            return (
              <li key={m.id}>
                <div className="group relative overflow-hidden rounded-md border border-border bg-muted">
                  <div className="relative aspect-square">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={m.alt ?? ''}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-fg">
                        <ActiveIcon className="h-7 w-7" aria-hidden="true" />
                      </div>
                    )}
                    {m.kind === 'VIDEO' && (
                      <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-pill bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <MonitorPlay className="h-3 w-3" aria-hidden="true" />
                        {m.durationSec ? formatDuration(m.durationSec) : 'video'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      aria-label="Xóa media"
                      title="Xóa"
                      className="absolute left-1 top-1 hidden h-7 w-7 items-center justify-center rounded-md bg-destructive text-white opacity-90 hover:opacity-100 group-hover:inline-flex no-tap-highlight"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="border-t border-border bg-surface px-2 py-1.5 text-[11px] text-muted-fg">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono">
                        {m.width && m.height ? `${m.width}×${m.height}` : '—'}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatBytes(m.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {cursor && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchPage(kind, cursor)}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 no-tap-highlight"
          >
            {loading ? 'Đang tải…' : 'Tải thêm'}
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-4 text-[11px] text-muted-fg">
        Phím tắt:{' '}
        <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
          /
        </kbd>{' '}
        tìm kiếm
      </p>

      {blocked && (
        <DeleteBlockedDialog
          state={blocked}
          busy={forceBusy}
          onClose={() => setBlocked(null)}
          onForce={() => void forceDelete()}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Xóa ${pendingDelete?.kind === 'VIDEO' ? 'video' : 'ảnh'} này?`}
        description="Hành động này không thể hoàn tác. Nếu media đang được dùng trong bài viết, sẽ có cảnh báo riêng."
        variant="danger"
        confirmLabel="Xóa"
        busy={deleteBusy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function EmptyState({
  kind,
  ActiveIcon,
  onUpload,
  acceptAttr,
  uploading,
  uploadPercent,
}: {
  kind: Kind;
  ActiveIcon: typeof ImageIcon;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  acceptAttr: string;
  uploading: boolean;
  uploadPercent: number;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ActiveIcon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        Chưa có {kind === 'IMAGE' ? 'ảnh' : 'video'} nào
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-fg">
        Upload {kind === 'IMAGE' ? 'ảnh' : 'video'} đầu tiên để dùng trong bài viết. Mỗi mục có thể
        tái sử dụng nhiều lần.
      </p>
      <label
        className={cn(
          'mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 no-tap-highlight',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {uploading ? `Đang tải ${uploadPercent}%` : `Upload ${kind === 'IMAGE' ? 'ảnh' : 'video'}`}
        <input type="file" accept={acceptAttr} className="hidden" onChange={onUpload} />
      </label>
    </Card>
  );
}

function DeleteBlockedDialog({
  state,
  busy,
  onClose,
  onForce,
}: {
  state: DeleteBlocked;
  busy: boolean;
  onClose: () => void;
  onForce: () => void;
}) {
  const label = state.media.kind === 'VIDEO' ? 'video' : 'ảnh';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 id="del-title" className="font-heading text-base font-semibold text-foreground">
              {label === 'video' ? 'Video' : 'Ảnh'} đang được dùng trong {state.posts.length} bài
            </h2>
            <p className="mt-0.5 text-sm text-muted-fg">
              Xóa sẽ làm {label} hỏng tại các vị trí dưới đây.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {state.posts.map((p) => {
            const editHref = `/admin/posts/${p.id}/edit` as Route;
            const usedLabel =
              p.usedAs === 'cover'
                ? 'Cover'
                : p.usedAs === 'content'
                  ? 'Nội dung'
                  : 'Cover + nội dung';
            return (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-fg">
                    <span className="inline-flex h-4 items-center rounded-pill bg-muted px-1.5 font-semibold uppercase tracking-wide">
                      {usedLabel}
                    </span>
                    <span>·</span>
                    <span className="font-mono">{p.status}</span>
                  </p>
                </div>
                <Link
                  href={editHref}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
                >
                  Sửa bài
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <p className="text-[11px] text-muted-fg">
            Khuyến nghị: sửa các bài trên trước rồi quay lại xóa.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
            >
              Đóng
            </button>
            <Button type="button" variant="danger" onClick={onForce} loading={busy}>
              Vẫn xóa
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
