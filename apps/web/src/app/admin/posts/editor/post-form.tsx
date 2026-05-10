'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { TiptapEditor } from './tiptap-editor';
import { PublishControls } from './publish-controls';
import type { AdminPost } from '@news/shared';

interface Props {
  initial?: AdminPost;
}

export function PostForm({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '');
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? '');
  const [seoDesc, setSeoDesc] = useState(initial?.seoDesc ?? '');
  const [contentJson, setContentJson] = useState<unknown>(
    initial?.contentJson ?? { type: 'doc', content: [] },
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const payload: Record<string, unknown> = { title, contentJson };
    if (slug) payload.slug = slug;
    if (excerpt) payload.excerpt = excerpt;
    if (coverImageUrl) payload.coverImageUrl = coverImageUrl;
    if (seoTitle) payload.seoTitle = seoTitle;
    if (seoDesc) payload.seoDesc = seoDesc;

    const url = initial ? `/api/posts/${initial.id}` : '/api/posts';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setErr(`Lưu thất bại (${res.status})`);
      return;
    }
    const post = await res.json();
    if (!initial) router.push(`/admin/posts/${post.id}/edit` as Route);
    else router.refresh();
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bài viết..."
          className="w-full rounded border px-4 py-3 text-2xl font-semibold"
        />
        <textarea
          value={excerpt ?? ''}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Tóm tắt..."
          rows={2}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <TiptapEditor content={contentJson} onChange={setContentJson} />
      </div>
      <aside className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <input
            value={slug ?? ''}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-tạo từ tiêu đề"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ảnh cover (URL)</label>
          <input
            value={coverImageUrl ?? ''}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">SEO</summary>
          <div className="mt-2 space-y-2">
            <input
              value={seoTitle ?? ''}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <textarea
              value={seoDesc ?? ''}
              onChange={(e) => setSeoDesc(e.target.value)}
              placeholder="SEO description"
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </details>
        <button
          type="button"
          onClick={save}
          disabled={saving || !title}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo bài'}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {initial && <PublishControls post={initial} />}
      </aside>
    </div>
  );
}
