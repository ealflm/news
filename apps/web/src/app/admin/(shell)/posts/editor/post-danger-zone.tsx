'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Props {
  postId: string;
  postTitle: string;
}

export function PostDangerZone({ postId, postTitle }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function del() {
    setConfirmOpen(false);
    setBusy(true);
    const r = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) {
      toast.error(`Xóa thất bại (${r.status})`);
      return;
    }
    toast.success('Đã xóa bài viết');
    router.push('/admin/posts' as Route);
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Vùng nguy hiểm
      </div>
      <p className="mb-3 text-xs text-muted-fg">
        Xóa bài viết sẽ xóa cả lượt xem, click, và overrides liên quan. Không thể hoàn tác.
      </p>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 bg-surface px-3 text-sm font-medium text-destructive hover:bg-destructive hover:text-white disabled:opacity-50 transition-colors no-tap-highlight"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Đang xóa...' : 'Xóa bài viết'}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={`Xóa bài "${postTitle}"?`}
        description="Hành động này không thể hoàn tác. Toàn bộ lượt xem, click affiliate và overrides liên quan cũng sẽ bị xóa."
        variant="danger"
        confirmLabel="Xóa vĩnh viễn"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void del()}
      />
    </div>
  );
}
