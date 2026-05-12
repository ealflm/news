'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, ImageOff, Pencil, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ImageEditorDialog } from '@/components/ui/image-editor-dialog';

interface Props {
  /** Current banner URL (absolute). */
  value: string;
  /** Called with new banner URL after upload or edit. */
  onChange: (url: string) => void;
}

/**
 * Banner picker for popups (or any "primary image" feature).
 * Flow:
 *  - No banner: dashed dropzone → opens editor with selected file
 *  - Has banner: preview + "Chỉnh sửa" (re-open editor) + "Đổi ảnh" (pick new file)
 */
export function BannerPicker({ value, onChange }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSrc, setEditingSrc] = useState<string>('');
  const [loadError, setLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLoadError(false), [value]);

  function openPicker() {
    fileInputRef.current?.click();
  }

  function openEditorWith(src: string) {
    setEditingSrc(src);
    setEditorOpen(true);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('File không phải ảnh');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error('Không đọc được file');
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        toast.error('Không đọc được file');
        return;
      }
      openEditorWith(src);
    };
    reader.readAsDataURL(f);
  }

  function editCurrent() {
    if (!value) return;
    openEditorWith(value);
  }

  return (
    <div>
      {/* Single shared file input outside any <button> to avoid invalid nesting */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />

      {value ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md border border-border bg-muted">
            {loadError ? (
              <div className="flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <ImageOff className="h-6 w-6 text-destructive" aria-hidden="true" />
                <p className="text-sm font-medium text-destructive">Không tải được ảnh</p>
                <p
                  className="max-w-full break-all rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-fg"
                  title={value}
                >
                  {value}
                </p>
                <p className="text-[11px] text-muted-fg">
                  URL banner không hợp lệ hoặc file không còn tồn tại.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    openPicker();
                  }}
                  className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary/90 no-tap-highlight"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Xóa & upload ảnh mới
                </button>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="banner"
                className="w-full max-h-80 object-contain"
                onError={() => setLoadError(true)}
              />
            )}
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Xóa banner"
              title="Xóa banner"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink no-tap-highlight"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={editCurrent}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Chỉnh sửa ảnh
            </button>
            <button
              type="button"
              onClick={openPicker}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Đổi ảnh khác
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-10 text-sm text-foreground transition-colors hover:bg-muted no-tap-highlight"
        >
          <ImageIcon className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-medium">Upload ảnh banner</span>
          <span className="text-[11px] text-muted-fg">
            Có thể crop, xoay và chọn tỉ lệ trước khi lưu
          </span>
        </button>
      )}

      <ImageEditorDialog
        open={editorOpen}
        imageSrc={editingSrc}
        onClose={() => setEditorOpen(false)}
        onDone={(_media, url) => {
          onChange(url);
          setEditorOpen(false);
        }}
      />
    </div>
  );
}
