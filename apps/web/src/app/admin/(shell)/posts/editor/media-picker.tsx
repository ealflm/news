'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ImageIcon as ImageLucide,
  MonitorPlay,
  Search,
  Upload,
  X,
} from 'lucide-react';
import type { MediaRecord, MediaListResponse } from '@news/shared';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { uploadMediaWithToast } from '@/components/ui/upload-toast';
import { cn } from '@/lib/cn';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const PAGE_LIMIT = 40;

export interface MediaPickerResult {
  media: MediaRecord;
  /** Absolute URL of the best-fit variant (or originalPath). */
  url: string;
  /** Optional video poster URL. */
  poster?: string;
}

interface Props {
  open: boolean;
  kind: 'IMAGE' | 'VIDEO';
  onClose: () => void;
  onPick: (result: MediaPickerResult) => void;
}

function pickImageUrl(m: MediaRecord): string | null {
  const v = (m.variants ?? null) as Record<string, string> | null;
  const path = v?.['1280w'] ?? v?.['720w'] ?? v?.['320w'] ?? m.originalPath ?? null;
  return path ? `${API_URL}${path}` : null;
}

function pickThumbUrl(m: MediaRecord): string | null {
  const v = (m.variants ?? null) as Record<string, string> | null;
  if (m.kind === 'VIDEO') {
    const poster = v?.poster ?? null;
    return poster ? `${API_URL}${poster}` : null;
  }
  const path = v?.['320w'] ?? v?.['720w'] ?? m.originalPath ?? null;
  return path ? `${API_URL}${path}` : null;
}

function pickVideoUrl(m: MediaRecord): string | null {
  const v = (m.variants ?? null) as Record<string, string> | null;
  const src = v?.['720p'] ?? m.originalPath ?? null;
  return src ? `${API_URL}${src}` : null;
}

export function MediaPicker({ open, kind, onClose, onPick }: Props) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const initialFetchedRef = useRef(false);

  const fetchPage = useCallback(
    async (next: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('kind', kind);
        params.set('limit', String(PAGE_LIMIT));
        if (next) params.set('cursor', next);
        const res = await fetch(`/api/media?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MediaListResponse;
        setItems((prev) => (next ? [...prev, ...data.items] : data.items));
        setCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'load failed');
      } finally {
        setLoading(false);
      }
    },
    [kind],
  );

  // Reset + fetch first page when opened
  useEffect(() => {
    if (!open) {
      initialFetchedRef.current = false;
      return;
    }
    if (initialFetchedRef.current) return;
    initialFetchedRef.current = true;
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setSelectedId(null);
    setQuery('');
    void fetchPage(null);
  }, [open, fetchPage]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, uploading]);

  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);

  async function doUpload(file: File) {
    setUploading(true);
    setUploadPercent(0);
    setError(null);
    const res = await uploadMediaWithToast(file, { onPercent: setUploadPercent });
    setUploading(false);
    setUploadPercent(0);
    if (!res.ok || !res.media) {
      setError(`Upload failed (${res.status})`);
      return;
    }
    // Prepend so admin sees it at top, and select it.
    setItems((prev) => [res.media!, ...prev]);
    setSelectedId(res.media.id);
  }

  async function uploadAndInsert(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (kind === 'VIDEO') {
      setPendingVideoFile(file);
      return;
    }
    await doUpload(file);
  }

  function insertSelected() {
    const m = items.find((it) => it.id === selectedId);
    if (!m) return;
    if (m.kind === 'IMAGE') {
      const url = pickImageUrl(m);
      if (url) onPick({ media: m, url });
    } else {
      const url = pickVideoUrl(m);
      if (!url) return;
      const poster = pickThumbUrl(m);
      onPick(poster ? { media: m, url, poster } : { media: m, url });
    }
  }

  const filtered = query.trim()
    ? items.filter((m) => (m.alt ?? '').toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  if (!open) return null;

  const accept = kind === 'IMAGE' ? 'image/*' : 'video/*';
  const Icon = kind === 'IMAGE' ? ImageLucide : MonitorPlay;
  const title = kind === 'IMAGE' ? 'Thư viện ảnh' : 'Thư viện video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="mp-title" className="font-heading text-base font-semibold text-foreground">
              {title}
            </h2>
            <span className="ml-1 inline-flex h-5 items-center rounded-pill bg-muted px-2 text-[11px] font-semibold text-muted-fg tabular-nums">
              {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
          <div className="relative w-full max-w-xs flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mô tả (alt)…"
              aria-label="Tìm media"
              className="h-9 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <label
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? `Đang tải ${uploadPercent}%` : 'Upload mới'}
            <input type="file" accept={accept} className="hidden" onChange={uploadAndInsert} />
          </label>
        </div>

        {/* Storage hint for video kind */}
        {kind === 'VIDEO' && (
          <div
            role="note"
            className="flex shrink-0 items-start gap-2 border-b border-border bg-accent/5 px-5 py-2.5 text-xs text-ink"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <p>
              <span className="font-medium text-foreground">Khuyến nghị</span>: nên upload video lên
              YouTube rồi dùng <span className="font-medium text-foreground">Add → YouTube</span>{' '}
              trong editor — tiết kiệm dung lượng ổ đĩa và bandwidth của server.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {items.length === 0 && !loading ? (
            <EmptyState kind={kind} />
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-fg">
              Không có media nào khớp với "{query}".
            </div>
          ) : (
            <ul
              role="listbox"
              aria-label={title}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            >
              {filtered.map((m) => {
                const thumb = pickThumbUrl(m);
                const selected = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedId(m.id)}
                      onDoubleClick={() => {
                        setSelectedId(m.id);
                        // tiny defer so state lands before insert reads `items`
                        setTimeout(insertSelected, 0);
                      }}
                      className={cn(
                        'group relative block w-full overflow-hidden rounded-md border bg-muted text-left transition-colors no-tap-highlight',
                        selected
                          ? 'border-primary ring-2 ring-primary/40'
                          : 'border-border hover:border-border-strong',
                      )}
                    >
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
                            <Icon className="h-6 w-6" aria-hidden="true" />
                          </div>
                        )}
                        {m.kind === 'VIDEO' && (
                          <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-pill bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            <MonitorPlay className="h-3 w-3" aria-hidden="true" />
                            {m.durationSec ? formatDuration(m.durationSec) : 'video'}
                          </span>
                        )}
                        {selected && (
                          <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-primary" />
                        )}
                      </div>
                      <div className="border-t border-border bg-surface px-2 py-1 text-[11px] text-muted-fg">
                        {m.width && m.height ? (
                          <span className="tabular-nums">
                            {m.width}×{m.height}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => cursor && void fetchPage(cursor)}
                disabled={loading || !cursor}
                className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 no-tap-highlight"
              >
                {loading ? 'Đang tải…' : 'Tải thêm'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-fg">
            {selectedId ? 'Bấm Chèn hoặc double-click để thêm.' : 'Chọn một mục để chèn.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
            >
              Hủy
            </button>
            <Button type="button" onClick={insertSelected} disabled={!selectedId}>
              Chèn
            </Button>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        open={pendingVideoFile !== null}
        title="Upload video trực tiếp?"
        description={
          'Khuyến nghị: nên upload video lên YouTube rồi nhúng vào bài (Add → YouTube).\n\n' +
          'Cách này tiết kiệm dung lượng ổ đĩa và bandwidth của server.'
        }
        confirmLabel="Vẫn upload"
        cancelLabel="Hủy"
        busy={uploading}
        onCancel={() => setPendingVideoFile(null)}
        onConfirm={async () => {
          const f = pendingVideoFile;
          setPendingVideoFile(null);
          if (f) await doUpload(f);
        }}
      />
    </div>
  );
}

function EmptyState({ kind }: { kind: 'IMAGE' | 'VIDEO' }) {
  const Icon = kind === 'IMAGE' ? ImageLucide : MonitorPlay;
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">
        Thư viện {kind === 'IMAGE' ? 'ảnh' : 'video'} chưa có gì
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-fg">
        Bấm "Upload mới" để thêm {kind === 'IMAGE' ? 'ảnh' : 'video'} đầu tiên.
      </p>
    </div>
  );
}

function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
