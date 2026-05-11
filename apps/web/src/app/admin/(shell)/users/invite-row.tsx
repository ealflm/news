'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { PendingInvite } from '@news/shared';

export function InviteRow({ invite }: { invite: PendingInvite }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (!confirm(`Hủy lời mời cho ${invite.email}?`)) return;
    setBusy(true);
    await fetch(`/api/users/invites/${invite.id}`, { method: 'DELETE' });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{invite.email}</p>
        <p className="text-xs text-muted-fg">
          Mời bởi {invite.invitedByEmail ?? '—'} · Hết hạn{' '}
          {new Date(invite.expiresAt).toLocaleString('vi-VN')}
        </p>
      </div>
      <button
        type="button"
        onClick={revoke}
        disabled={busy}
        aria-label={`Hủy lời mời cho ${invite.email}`}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 no-tap-highlight"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
