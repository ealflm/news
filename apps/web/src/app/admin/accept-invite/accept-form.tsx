'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function AcceptInviteForm({
  token,
  suggestedName,
}: {
  token: string;
  suggestedName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`${API_URL}/api/users/accept-invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, displayName: name, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? `Không thể chấp nhận lời mời (${res.status})`);
      return;
    }
    router.push('/admin/login');
  }

  if (!token) {
    return <p className="text-sm text-destructive">Link lời mời không hợp lệ.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-ink">
          Tên hiển thị
        </label>
        <div className="relative">
          <UserIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
            aria-hidden="true"
          />
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            autoComplete="name"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Mật khẩu (tối thiểu 8 ký tự)
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
            aria-hidden="true"
          />
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <Button type="submit" loading={busy} className="w-full" size="lg">
        Hoàn tất đăng ký
      </Button>
    </form>
  );
}
