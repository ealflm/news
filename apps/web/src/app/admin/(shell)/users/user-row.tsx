'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { UserListItem } from '@news/shared';

export function UserRow({ user }: { user: UserListItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(`Xóa người dùng ${user.email}?`)) return;
    setBusy(true);
    const r = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) {
      alert(`Xóa thất bại (${r.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 font-heading font-bold text-primary">
        {user.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{user.displayName}</p>
        <p className="truncate text-sm text-muted-fg">{user.email}</p>
      </div>
      <span className="hidden text-xs text-muted-fg sm:inline">
        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
      </span>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        aria-label={`Xóa ${user.email}`}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 no-tap-highlight"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
