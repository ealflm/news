'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Variant = 'danger' | 'primary';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  variant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';
  const defaultConfirm = variant === 'danger' ? 'Xóa' : 'Xác nhận';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          {variant === 'danger' && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <h2
            id="confirm-title"
            className="flex-1 pt-0.5 font-heading text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => !busy && onCancel()}
            disabled={busy}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {description && (
          <div className="px-5 py-4">
            <p className="whitespace-pre-line text-sm text-muted-fg">{description}</p>
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
          >
            {cancelLabel}
          </button>
          <Button type="button" variant={buttonVariant} onClick={onConfirm} loading={busy}>
            {confirmLabel ?? defaultConfirm}
          </Button>
        </footer>
      </div>
    </div>
  );
}
