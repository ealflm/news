'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'react-toastify';
import { EyeOff, Globe2, Trash2, X } from 'lucide-react';
import type { PostListItem } from '@news/shared';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/cn';

interface Props {
  items: PostListItem[];
  nextCursor: string | null;
  searchParams: { status?: string; q?: string };
}

type Action = 'delete' | 'publish' | 'unpublish';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-fg',
  PUBLISHED: 'bg-success/10 text-success border border-success/30',
  SCHEDULED: 'bg-accent/10 text-accent border border-accent/30',
};

export function PostsTable({ items, nextCursor, searchParams }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const selectionSummary = useMemo(() => {
    let draft = 0;
    let published = 0;
    let scheduled = 0;
    for (const it of items) {
      if (!selectedIds.has(it.id)) continue;
      if (it.status === 'PUBLISHED') published++;
      else if (it.status === 'SCHEDULED') scheduled++;
      else draft++;
    }
    return { draft, published, scheduled, total: selectedIds.size };
  }, [items, selectedIds]);

  const allChecked = items.length > 0 && items.every((p) => selectedIds.has(p.id));
  const someChecked = !allChecked && items.some((p) => selectedIds.has(p.id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allChecked) return new Set();
      const next = new Set(prev);
      items.forEach((p) => next.add(p.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function requestBulk(action: Action) {
    if (busyAction) return;
    if (selectedIds.size === 0) return;
    if (action === 'delete') {
      setConfirmDeleteOpen(true);
      return;
    }
    void runBulk(action);
  }

  async function runBulk(action: Action) {
    if (busyAction) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBusyAction(action);

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        if (action === 'delete') {
          const r = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
          if (!r.ok) throw new Error(`${r.status}`);
        } else if (action === 'publish') {
          const r = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
          if (!r.ok) throw new Error(`${r.status}`);
        } else {
          const r = await fetch(`/api/posts/${id}/unpublish`, { method: 'POST' });
          if (!r.ok) throw new Error(`${r.status}`);
        }
        return id;
      }),
    );

    setBusyAction(null);

    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - okCount;

    const verb =
      action === 'delete' ? 'Đã xóa' : action === 'publish' ? 'Đã xuất bản' : 'Đã bỏ xuất bản';

    if (okCount > 0) toast.success(`${verb} ${okCount} bài`);
    if (failCount > 0) toast.error(`${failCount} bài thất bại`);

    // Remove successful ids from selection (others kept so user can retry)
    if (okCount > 0) {
      const successIds = new Set(
        results
          .map((r, i) => (r.status === 'fulfilled' ? ids[i] : null))
          .filter((x): x is string => x !== null),
      );
      setSelectedIds((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => {
          if (!successIds.has(id)) next.add(id);
        });
        return next;
      });
      router.refresh();
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả bài trên trang"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
              </th>
              <th className="px-4 py-3 font-medium text-ink">Tiêu đề</th>
              <th className="px-4 py-3 font-medium text-ink">Slug</th>
              <th className="px-4 py-3 font-medium text-ink">Trạng thái</th>
              <th className="px-4 py-3 font-medium text-ink">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-fg">
                  Không có bài viết nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'border-b border-border last:border-0 transition-colors',
                      checked ? 'bg-primary/5' : 'hover:bg-muted/50',
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Chọn "${p.title}"`}
                        checked={checked}
                        onChange={() => toggleOne(p.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/posts/${p.id}/edit` as Route}
                        className="font-medium text-accent hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-fg font-mono text-xs">{p.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex h-5 items-center rounded-pill px-2 text-[11px] font-semibold uppercase tracking-wide',
                          STATUS_STYLES[p.status] ?? STATUS_STYLES.DRAFT,
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-fg tabular-nums text-xs">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="mt-4">
          <Link
            href={
              `/admin/posts?cursor=${nextCursor}${searchParams.q ? `&q=${searchParams.q}` : ''}${
                searchParams.status ? `&status=${searchParams.status}` : ''
              }` as Route
            }
            className="text-sm font-medium text-accent hover:underline"
          >
            Trang sau →
          </Link>
        </div>
      )}

      {/* Sticky bulk action bar */}
      {selectionSummary.total > 0 && (
        <div
          role="region"
          aria-label="Hành động hàng loạt"
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 shadow-xl"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-2 text-sm font-medium text-ink">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold text-on-primary tabular-nums">
                {selectionSummary.total}
              </span>
              đã chọn
            </span>
            <span className="text-[11px] text-muted-fg">
              {selectionSummary.draft > 0 && `${selectionSummary.draft} DRAFT`}
              {selectionSummary.draft > 0 && selectionSummary.published > 0 && ' · '}
              {selectionSummary.published > 0 && `${selectionSummary.published} PUBLISHED`}
            </span>

            <div className="ml-1 h-6 w-px bg-border" aria-hidden="true" />

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => requestBulk('publish')}
              loading={busyAction === 'publish'}
              disabled={!!busyAction || selectionSummary.draft === 0}
              title={
                selectionSummary.draft === 0 ? 'Không có DRAFT trong selection' : 'Xuất bản DRAFT'
              }
            >
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
              Xuất bản
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => requestBulk('unpublish')}
              loading={busyAction === 'unpublish'}
              disabled={!!busyAction || selectionSummary.published === 0}
              title={
                selectionSummary.published === 0
                  ? 'Không có PUBLISHED trong selection'
                  : 'Bỏ xuất bản'
              }
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Bỏ xuất bản
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => requestBulk('delete')}
              loading={busyAction === 'delete'}
              disabled={!!busyAction}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa
            </Button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={!!busyAction}
              aria-label="Bỏ chọn tất cả"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Xóa ${selectionSummary.total} bài viết?`}
        description="Hành động này không thể hoàn tác. Toàn bộ lượt xem, click, và overrides liên quan cũng sẽ bị xóa."
        variant="danger"
        confirmLabel="Xóa vĩnh viễn"
        busy={busyAction === 'delete'}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          await runBulk('delete');
        }}
      />
    </>
  );
}
