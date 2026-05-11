'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { TiptapEditor } from './tiptap-editor';
import { PublishControls } from './publish-controls';
import { CoverImagePicker } from './cover-image-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AdminPost, AdminPopup, OverrideAction } from '@news/shared';

interface Props {
  initial?: AdminPost;
  popups?: AdminPopup[];
  initialOverrides?: { popupId: string; action: OverrideAction }[];
}

export function PostForm({ initial, popups, initialOverrides }: Props) {
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
  const [overrides, setOverrides] = useState<{ popupId: string; action: OverrideAction }[]>(
    initialOverrides ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveOverrides(postId: string) {
    await fetch(`/api/popups/overrides/${postId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(overrides),
    });
  }
  function setAction(popupId: string, action: OverrideAction | null) {
    setOverrides((prev) => {
      const without = prev.filter((o) => o.popupId !== popupId);
      if (action === null) return without;
      return [...without, { popupId, action }];
    });
  }
  function getAction(popupId: string): OverrideAction | null {
    return overrides.find((o) => o.popupId === popupId)?.action ?? null;
  }

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
    else {
      if (initial) await saveOverrides(initial.id);
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bài viết..."
          className="h-auto rounded-md border px-4 py-3 font-heading text-2xl font-semibold"
        />
        <Textarea
          value={excerpt ?? ''}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Tóm tắt..."
          rows={2}
        />
        <TiptapEditor content={contentJson} onChange={setContentJson} />
      </div>
      <aside className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Slug</label>
          <Input
            value={slug ?? ''}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-tạo từ tiêu đề"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Ảnh cover</label>
          <CoverImagePicker
            value={coverImageUrl || null}
            onChange={(u) => setCoverImageUrl(u ?? '')}
          />
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-ink">SEO</summary>
          <div className="mt-2 space-y-2">
            <Input
              value={seoTitle ?? ''}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title"
            />
            <Textarea
              value={seoDesc ?? ''}
              onChange={(e) => setSeoDesc(e.target.value)}
              placeholder="SEO description"
              rows={3}
            />
          </div>
        </details>
        {popups && popups.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Popup overrides
            </summary>
            <div className="mt-2 space-y-1 text-xs">
              {popups.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">
                    {p.name} {p.isGlobal && <em className="text-muted-fg">(global)</em>}
                  </span>
                  <select
                    value={getAction(p.id) ?? ''}
                    onChange={(e) => {
                      const v = e.target.value as '' | OverrideAction;
                      setAction(p.id, v === '' ? null : v);
                    }}
                    className="rounded-md border border-border bg-surface px-1 py-0.5 text-xs text-ink"
                  >
                    <option value="">Default</option>
                    <option value="ATTACH">Attach</option>
                    <option value="DETACH">Detach</option>
                  </select>
                </div>
              ))}
            </div>
          </details>
        )}
        <Button
          type="button"
          onClick={save}
          loading={saving}
          disabled={saving || !title}
          className="w-full"
        >
          {saving ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo bài'}
        </Button>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {initial && <PublishControls post={initial} />}
      </aside>
    </div>
  );
}
