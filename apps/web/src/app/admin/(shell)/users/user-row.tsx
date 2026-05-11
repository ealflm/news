'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { KeyRound, Trash2 } from 'lucide-react';
import type { UserListItem } from '@news/shared';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChangePasswordDialog } from './change-password-dialog';

interface Props {
  user: UserListItem;
  isSelf: boolean;
}

export function UserRow({ user, isSelf }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function del() {
    setConfirmOpen(false);
    setBusy(true);
    const r = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) {
      toast.error(`Xóa thất bại (${r.status})`);
      return;
    }
    toast.success(`Đã xóa @${user.username}`);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_140px_220px]">
        {/* User column */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-heading text-sm font-bold ${
              isSelf ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'
            }`}
            aria-hidden="true"
          >
            {user.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-ink">{user.displayName}</p>
              {isSelf && (
                <span className="inline-flex h-5 items-center rounded-pill border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Bạn
                </span>
              )}
            </div>
            <p className="truncate text-sm text-muted-fg">
              <span className="font-mono">@{user.username}</span>
            </p>
          </div>
        </div>

        {/* Date column (desktop) */}
        <div className="hidden text-xs text-muted-fg tabular-nums md:block">
          {new Date(user.createdAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>

        {/* Actions column */}
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label={`Đổi mật khẩu cho @${user.username}`}
            title="Đổi mật khẩu"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:border-border-strong hover:bg-muted no-tap-highlight"
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Đổi mật khẩu</span>
          </button>
          <button
            type="button"
            onClick={() => !isSelf && setConfirmOpen(true)}
            disabled={busy || isSelf}
            aria-label={isSelf ? 'Không thể tự xóa tài khoản' : `Xóa @${user.username}`}
            title={isSelf ? 'Không thể tự xóa tài khoản' : 'Xóa người dùng'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-fg hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-fg no-tap-highlight"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {dialogOpen && (
        <ChangePasswordDialog
          userId={user.id}
          username={user.username}
          onClose={() => setDialogOpen(false)}
          onDone={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Xóa người dùng @${user.username}?`}
        description="Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xóa vĩnh viễn"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void del()}
      />
    </>
  );
}
