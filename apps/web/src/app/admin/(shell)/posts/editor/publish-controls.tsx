'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { AdminPost } from '@news/shared';
import { Button } from '@/components/ui/button';

export function PublishControls({ post }: { post: AdminPost }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function callAction(path: string) {
    setBusy(true);
    await fetch(path, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  async function deletePost() {
    if (!confirm('Xác nhận xóa bài viết?')) return;
    setBusy(true);
    await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    setBusy(false);
    router.push('/admin/posts' as Route);
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm text-ink">
        Trạng thái: <span className="font-mono text-foreground">{post.status}</span>
      </p>
      {post.status !== 'PUBLISHED' ? (
        <Button
          variant="accent"
          onClick={() => callAction(`/api/posts/${post.id}/publish`)}
          disabled={busy}
          loading={busy}
          className="w-full"
        >
          Xuất bản
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => callAction(`/api/posts/${post.id}/unpublish`)}
          disabled={busy}
          loading={busy}
          className="w-full"
        >
          Bỏ xuất bản
        </Button>
      )}
      <Button variant="danger" onClick={deletePost} disabled={busy} className="w-full">
        Xóa
      </Button>
    </div>
  );
}
