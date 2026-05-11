'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, User as UserIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

interface Props {
  open: boolean;
  onClose: () => void;
}

interface CreatedSummary {
  username: string;
  displayName: string;
  password: string;
}

export function CreateUserDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset state when (re)opening
  useEffect(() => {
    if (!open) return;
    setUsername('');
    setDisplayName('');
    setPassword('');
    setShowPassword(false);
    setBusy(false);
    setError(null);
    setCreated(null);
    setCopied(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  // ESC to close (but block while busy or while showing unconfirmed credentials)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (busy) return;
      if (created) return; // force admin to acknowledge credentials first
      onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, created, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanUsername = username.trim();
    const cleanDisplay = displayName.trim() || cleanUsername;
    if (cleanUsername.length < 3) {
      setError('Username phải có tối thiểu 3 ký tự');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        displayName: cleanDisplay,
        password,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      if (res.status === 409) setError('Username này đã được sử dụng');
      else if (res.status === 400)
        setError('Dữ liệu chưa hợp lệ. Username chỉ chứa a–z, 0–9, dấu . _ -');
      else setError(`Tạo người dùng thất bại (${res.status})`);
      return;
    }
    setCreated({ username: cleanUsername, displayName: cleanDisplay, password });
    router.refresh();
  }

  function fillRandom() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  async function copyPair() {
    if (!created) return;
    const text = `Username: ${created.username}\nPassword: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore — admin can copy manually from the visible field */
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-hidden={false}>
      {/* Scrim */}
      <button
        type="button"
        aria-label="Đóng dialog"
        onClick={() => {
          if (busy || created) return;
          onClose();
        }}
        className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cud-title"
        className="relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 id="cud-title" className="font-heading text-base font-semibold text-foreground">
              {created ? 'Đã tạo người dùng' : 'Tạo người dùng mới'}
            </h2>
            <p className="text-xs text-muted-fg">
              {created
                ? 'Lưu lại thông tin đăng nhập trước khi đóng — sẽ không hiển thị lại.'
                : 'Tài khoản admin sẽ đăng nhập bằng username + mật khẩu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (busy || created) return;
              onClose();
            }}
            disabled={busy || !!created}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-40 no-tap-highlight"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {created ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-ink">
                Đã tạo tài khoản <span className="font-medium">@{created.username}</span>. Gửi thông
                tin đăng nhập dưới đây cho người dùng.
              </div>

              <dl className="space-y-3">
                <div>
                  <dt className="mb-1 text-xs font-medium text-muted-fg">Username</dt>
                  <dd className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-ink">
                    {created.username}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-medium text-muted-fg">Mật khẩu</dt>
                  <dd className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-ink">
                    <span className="flex-1 break-all">{created.password}</span>
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => void copyPair()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface text-sm font-medium text-foreground hover:bg-muted no-tap-highlight"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy username + mật khẩu
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-border p-4">
              <Button type="button" onClick={onClose} className="w-full">
                Đã lưu, đóng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col" noValidate>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="space-y-1.5">
                <label htmlFor="cud-username" className="block text-xs font-medium text-ink">
                  Username <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <UserIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                    aria-hidden="true"
                  />
                  <Input
                    id="cud-username"
                    ref={firstFieldRef}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 font-mono"
                    placeholder="content_a"
                    minLength={3}
                    maxLength={60}
                    pattern="[a-zA-Z0-9._\-]+"
                  />
                </div>
                <p className="text-[11px] text-muted-fg">
                  3–60 ký tự · chỉ a–z, 0–9, dấu <code>. _ -</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cud-name" className="block text-xs font-medium text-ink">
                  Tên hiển thị
                </label>
                <Input
                  id="cud-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-fg">
                  Hiển thị ở admin & footer. Để trống sẽ lấy theo username.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cud-password" className="block text-xs font-medium text-ink">
                  Mật khẩu <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                    aria-hidden="true"
                  />
                  <Input
                    id="cud-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 font-mono"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fillRandom}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] font-medium text-foreground hover:bg-muted no-tap-highlight"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Tạo mật khẩu ngẫu nhiên
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink disabled:opacity-50 no-tap-highlight"
              >
                Hủy
              </button>
              <Button type="submit" loading={busy}>
                Tạo tài khoản
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
