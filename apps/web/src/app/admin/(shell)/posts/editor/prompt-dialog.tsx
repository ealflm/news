'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface PromptConfig {
  title: string;
  /** Helper text shown under the title. \n preserved. */
  description?: string;
  placeholder?: string;
  initialValue?: string;
  /** Textarea instead of single-line input. */
  multiline?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Called with trimmed input. Return false to keep dialog open (validation failure). */
  onSubmit: (value: string) => boolean | void | Promise<boolean | void>;
}

export function PromptDialog({
  config,
  onClose,
}: {
  config: PromptConfig | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!config) return;
    setValue(config.initialValue ?? '');
    setBusy(false);
    const t = setTimeout(() => {
      if (config.multiline) textareaRef.current?.focus();
      else inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config, busy, onClose]);

  if (!config) return null;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || !config) return;
    setBusy(true);
    const result = await config.onSubmit(value);
    if (result === false) {
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-border px-5 py-3">
          <h2 id="prompt-title" className="font-heading text-base font-semibold text-foreground">
            {config.title}
          </h2>
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

        <div className="space-y-3 px-5 py-4">
          {config.description && (
            <p className="whitespace-pre-line text-sm text-muted-fg">{config.description}</p>
          )}
          {config.multiline ? (
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              rows={5}
              className="font-mono text-xs"
            />
          ) : (
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
          >
            {config.cancelLabel ?? 'Hủy'}
          </button>
          <Button type="submit" loading={busy}>
            {config.submitLabel ?? 'OK'}
          </Button>
        </footer>
      </form>
    </div>
  );
}
