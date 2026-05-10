'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@news/shared';

interface Props {
  initial: MediaRecord[];
  apiUrl: string;
}

export function MediaGrid({ initial, apiUrl }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/media', { method: 'POST', body: fd });
    if (!res.ok) {
      alert(`Upload failed: ${res.status}`);
      return;
    }
    const data = (await res.json()) as { media: MediaRecord };
    setItems((prev) => [data.media, ...prev]);
    e.target.value = '';
  }

  async function onDelete(id: string) {
    if (!confirm('Xóa ảnh này?')) return;
    const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert(`Delete failed: ${res.status}`);
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <div>
      <label className="mb-4 inline-block cursor-pointer rounded bg-black px-4 py-2 text-sm text-white">
        + Upload ảnh
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>

      {items.length === 0 ? (
        <p className="text-gray-500">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => {
            const variants = (
              m.variants && typeof m.variants === 'object' ? m.variants : {}
            ) as Record<string, string>;
            const thumbKey =
              '320w' in variants
                ? '320w'
                : '720w' in variants
                  ? '720w'
                  : (Object.keys(variants)[0] ?? null);
            const thumbPath = thumbKey ? variants[thumbKey] : null;
            const src = thumbPath ? `${apiUrl}${thumbPath}` : null;
            return (
              <div key={m.id} className="group relative overflow-hidden rounded border bg-gray-50">
                {src ? (
                  <img src={src} alt={m.alt ?? ''} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square bg-gray-200" />
                )}
                <button
                  onClick={() => onDelete(m.id)}
                  className="absolute top-1 right-1 hidden rounded bg-red-600 px-2 py-0.5 text-xs text-white group-hover:block"
                >
                  Xóa
                </button>
                <div className="p-1 text-xs text-gray-500">
                  {m.width}×{m.height}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
