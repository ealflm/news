'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, UserPlus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function InvitePanel() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, displayName: name || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.status === 409 ? 'Email đã tồn tại' : 'Gửi lời mời thất bại');
      return;
    }
    const data = (await res.json()) as { inviteUrl: string };
    setInviteUrl(data.inviteUrl);
    setEmail('');
    setName('');
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-lg font-semibold text-ink">Mời thành viên</h2>
      </div>
      <form
        onSubmit={submit}
        className="space-y-3 sm:flex sm:items-end sm:gap-3 sm:space-y-0"
        noValidate
      >
        <div className="flex-1">
          <label htmlFor="invite-email" className="mb-1 block text-xs font-medium text-ink">
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true"
            />
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              placeholder="email@example.com"
            />
          </div>
        </div>
        <div className="sm:w-56">
          <label htmlFor="invite-name" className="mb-1 block text-xs font-medium text-ink">
            Tên hiển thị (tùy chọn)
          </label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </div>
        <Button type="submit" loading={busy} variant="accent">
          Gửi lời mời
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {inviteUrl && (
        <div className="mt-4 rounded-md border border-success/30 bg-success/10 p-3">
          <p className="text-sm font-medium text-ink">Đã tạo lời mời. Link (hết hạn sau 24h):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-surface px-2 py-1 text-xs">
              {inviteUrl}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteUrl).catch(() => {})}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border-strong px-2 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
