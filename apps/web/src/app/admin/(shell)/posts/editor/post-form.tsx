'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { toast } from 'react-toastify';
import type { AdminPost, AdminPopup, OverrideAction } from '@news/shared';
import { Textarea } from '@/components/ui/textarea';
import { TiptapEditor } from './tiptap-editor';
import { CoverImagePicker } from './cover-image-picker';
import { PostActionBar } from './post-action-bar';
import { PostStatusCard } from './post-status-card';
import { PostSeoSection } from './post-seo-section';
import { PostPopupOverrides } from './post-popup-overrides';
import { PostDangerZone } from './post-danger-zone';

interface Props {
  initial?: AdminPost;
  popups?: AdminPopup[];
  initialOverrides?: { popupId: string; action: OverrideAction }[];
}

function countWords(json: unknown): number {
  if (!json || typeof json !== 'object') return 0;
  let count = 0;
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') {
      count += n.text.trim().split(/\s+/).filter(Boolean).length;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }
  walk(json);
  return count;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export function PostForm({ initial, popups, initialOverrides }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
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
  const [publishing, setPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initial ? new Date(initial.updatedAt) : null,
  );
  const [dirty, setDirty] = useState(false);

  // Auto-derive slug from title if user hasn't touched it
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // Mark dirty on any state change after mount
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setDirty(true);
  }, [title, slug, excerpt, coverImageUrl, seoTitle, seoDesc, contentJson, overrides]);

  // beforeunload guard
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Cmd/Ctrl+S keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving && title.trim()) void save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, title, slug, excerpt, coverImageUrl, seoTitle, seoDesc, contentJson, overrides]);

  async function saveOverrides(postId: string) {
    await fetch(`/api/popups/overrides/${postId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(overrides),
    });
  }

  async function save(): Promise<boolean> {
    if (!title.trim()) {
      toast.error('Tiêu đề là bắt buộc');
      return false;
    }
    setSaving(true);
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
      toast.error(`Lưu thất bại (${res.status})`);
      return false;
    }
    toast.success(initial ? 'Đã lưu thay đổi' : 'Đã tạo bài viết');
    const post = await res.json();
    setLastSavedAt(new Date());
    setDirty(false);
    if (!initial) {
      router.push(`/admin/posts/${post.id}/edit` as Route);
      return true;
    }
    await saveOverrides(initial.id);
    router.refresh();
    return true;
  }

  async function publish() {
    if (!initial) {
      const ok = await save();
      if (!ok) return;
      return;
    }
    setPublishing(true);
    if (dirty) {
      const ok = await save();
      if (!ok) {
        setPublishing(false);
        return;
      }
    }
    const r = await fetch(`/api/posts/${initial.id}/publish`, { method: 'POST' });
    setPublishing(false);
    if (r.ok) {
      toast.success('Đã xuất bản');
      router.refresh();
    } else {
      toast.error(`Xuất bản thất bại (${r.status})`);
    }
  }

  async function unpublish() {
    if (!initial) return;
    setPublishing(true);
    const r = await fetch(`/api/posts/${initial.id}/unpublish`, { method: 'POST' });
    setPublishing(false);
    if (r.ok) {
      toast.success('Đã bỏ xuất bản');
      router.refresh();
    } else {
      toast.error(`Bỏ xuất bản thất bại (${r.status})`);
    }
  }

  const wordCount = countWords(contentJson);
  const readMinutes = Math.max(1, Math.round(wordCount / 220));
  const savedLabel = !lastSavedAt
    ? 'Chưa lưu'
    : dirty
      ? 'Đang chỉnh sửa...'
      : `Đã lưu lúc ${lastSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <>
      <PostActionBar
        title={title}
        statusLabel={initial?.status ?? 'DRAFT'}
        onSave={() => void save()}
        onPublish={() => void publish()}
        {...(initial && initial.status === 'PUBLISHED'
          ? { onUnpublish: () => void unpublish() }
          : {})}
        saving={saving}
        canSave={Boolean(title.trim())}
        publishing={publishing}
        isPublished={initial?.status === 'PUBLISHED'}
      />

      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,768px)_320px]">
        {/* Main column — width matches public post page (max-w-3xl ≈ 768px) */}
        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            <label htmlFor="post-title" className="sr-only">
              Tiêu đề bài viết
            </label>
            <textarea
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                // Prevent Enter from inserting newline — title is a single sentence.
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Tiêu đề bài viết..."
              required
              autoFocus={!initial}
              rows={1}
              className="w-full resize-none overflow-hidden border-0 bg-transparent px-0 font-heading text-3xl font-bold leading-tight text-foreground placeholder:text-muted-fg/60 focus:outline-none field-sizing-content"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-slug" className="block text-xs font-medium text-muted-fg">
              Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-fg">/</span>
              <input
                id="post-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="auto-tạo từ tiêu đề"
                className="flex-1 border-0 bg-transparent px-0 font-mono text-sm text-ink focus:outline-none focus:ring-0"
              />
            </div>
            <p className="text-[11px] text-muted-fg">URL tự sinh từ tiêu đề. Có thể chỉnh tay.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="post-excerpt" className="block text-xs font-medium text-muted-fg">
              Tóm tắt
            </label>
            <Textarea
              id="post-excerpt"
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Mô tả ngắn hiển thị trên homepage và social share..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-fg">Nội dung</label>
            <TiptapEditor content={contentJson} onChange={setContentJson} />
          </div>

          {/* Status line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-fg">
            <span className="tabular-nums">{wordCount} từ</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{readMinutes} phút đọc</span>
            <span aria-hidden="true">·</span>
            <span className={dirty ? 'text-accent' : ''}>{savedLabel}</span>
          </div>
        </div>

        {/* Aside */}
        <aside className="space-y-4">
          {initial && <PostStatusCard post={initial} />}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-fg">Ảnh cover</label>
            <CoverImagePicker
              value={coverImageUrl || null}
              onChange={(u) => setCoverImageUrl(u ?? '')}
            />
          </div>

          <PostSeoSection
            seoTitle={seoTitle}
            seoDesc={seoDesc}
            onSeoTitle={setSeoTitle}
            onSeoDesc={setSeoDesc}
          />

          {popups && popups.length > 0 && (
            <PostPopupOverrides popups={popups} overrides={overrides} onChange={setOverrides} />
          )}

          {initial && <PostDangerZone postId={initial.id} postTitle={initial.title} />}
        </aside>
      </div>
    </>
  );
}
