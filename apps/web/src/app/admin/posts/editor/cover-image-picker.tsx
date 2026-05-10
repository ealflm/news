'use client';

import { useState } from 'react';
import type { MediaRecord } from '@news/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImagePicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', f);
    const res = await fetch('/api/media', { method: 'POST', body: fd });
    setBusy(false);
    e.target.value = '';
    if (!res.ok) {
      alert(`Upload failed: ${res.status}`);
      return;
    }
    const data = (await res.json()) as { media: MediaRecord };
    const v = data.media.variants as Record<string, string> | null;
    const path = (v && (v['1280w'] ?? v['720w'] ?? v['320w'])) ?? data.media.originalPath ?? null;
    onChange(path ? `${API_URL}${path}` : null);
  }

  return (
    <div>
      {value ? (
        <div className="mb-2">
          <img src={value} alt="cover" className="w-full rounded border object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 text-xs text-red-600 underline"
          >
            Xóa ảnh cover
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer rounded border border-dashed bg-gray-50 px-3 py-6 text-center text-sm text-gray-500 hover:bg-gray-100">
          {busy ? 'Đang upload...' : 'Click để upload ảnh cover'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
            disabled={busy}
          />
        </label>
      )}
    </div>
  );
}
