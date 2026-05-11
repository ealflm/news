'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

interface Props {
  userId: string;
  username: string;
  onClose: () => void;
  onDone?: () => void;
}

export function ChangePasswordDialog({ userId, username, onClose, onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr('Mật khẩu phải tối thiểu 8 ký tự');
      return;
    }
    if (password !== confirm) {
      setErr('Mật khẩu nhập lại không khớp');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/users/${userId}/password`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr(`Đổi mật khẩu thất bại (${res.status})`);
      return;
    }
    setDone(true);
    onDone?.();
  }

  function fillRandom() {
    const pw = generatePassword();
    setPassword(pw);
    setConfirm(pw);
    setShow(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cp-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 id="cp-title" className="font-heading text-base font-semibold text-foreground">
            Đổi mật khẩu — <span className="text-muted-fg font-normal font-mono">@{username}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="p-5">
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-ink">
              Đã đổi mật khẩu thành công. Hãy chia sẻ mật khẩu mới cho người dùng.
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="cp-password" className="block text-xs font-medium text-ink">
                Mật khẩu mới
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                    aria-hidden="true"
                  />
                  <Input
                    id="cp-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    className="pl-10 pr-10 font-mono"
                    placeholder="Tối thiểu 8 ký tự"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fillRandom}
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Ngẫu nhiên
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cp-confirm" className="block text-xs font-medium text-ink">
                Nhập lại
              </label>
              <Input
                id="cp-confirm"
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="font-mono"
              />
            </div>

            {err && (
              <p role="alert" className="text-sm text-destructive">
                {err}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
              >
                Hủy
              </button>
              <Button type="submit" loading={busy}>
                Lưu mật khẩu
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
