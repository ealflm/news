'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { AdminPost } from '@news/shared';

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
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm">
        Trạng thái: <span className="font-mono">{post.status}</span>
      </p>
      {post.status !== 'PUBLISHED' ? (
        <button
          onClick={() => callAction(`/api/posts/${post.id}/publish`)}
          disabled={busy}
          className="w-full rounded border bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Xuất bản
        </button>
      ) : (
        <button
          onClick={() => callAction(`/api/posts/${post.id}/unpublish`)}
          disabled={busy}
          className="w-full rounded border px-4 py-2 text-sm"
        >
          Bỏ xuất bản
        </button>
      )}
      <button
        onClick={deletePost}
        disabled={busy}
        className="w-full rounded border border-red-300 px-4 py-2 text-sm text-red-600"
      >
        Xóa
      </button>
    </div>
  );
}
