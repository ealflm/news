'use client';

import { useState } from 'react';
import { ImageIcon, FolderOpen, Upload, X } from 'lucide-react';
import { uploadMediaWithToast } from '@/components/ui/upload-toast';
import { MediaPicker } from './media-picker';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImagePicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setPercent(0);
    const res = await uploadMediaWithToast(f, { onPercent: setPercent });
    setBusy(false);
    setPercent(0);
    if (!res.ok || !res.media) return;
    const v = res.media.variants as Record<string, string> | null;
    const path = v?.['1280w'] ?? v?.['720w'] ?? v?.['320w'] ?? res.media.originalPath ?? null;
    onChange(path ? `${API_URL}${path}` : null);
  }

  return (
    <div>
      {value ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="cover" className="w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Xóa ảnh cover"
              title="Xóa ảnh cover"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink no-tap-highlight"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground hover:border-border-strong hover:bg-muted no-tap-highlight"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Chọn từ thư viện
            </button>
            <label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground hover:border-border-strong hover:bg-muted no-tap-highlight">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {busy ? `${percent}%` : 'Thay ảnh'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUpload}
                disabled={busy}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/40 px-3 py-5 text-sm text-foreground transition-colors hover:bg-muted no-tap-highlight"
          >
            <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium">Chọn từ thư viện</span>
          </button>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/40 px-3 py-5 text-sm text-foreground transition-colors hover:bg-muted no-tap-highlight">
            <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium tabular-nums">
              {busy ? `Đang tải ${percent}%` : 'Upload mới'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
              disabled={busy}
            />
          </label>
        </div>
      )}

      <MediaPicker
        open={pickerOpen}
        kind="IMAGE"
        onClose={() => setPickerOpen(false)}
        onPick={(r) => {
          onChange(r.url);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
