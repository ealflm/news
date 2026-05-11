'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, UserPlus, Users as UsersIcon, X } from 'lucide-react';
import type { UserListItem } from '@news/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateUserDialog } from './create-user-dialog';
import { UserRow } from './user-row';

interface Props {
  users: UserListItem[];
  selfId: string | null;
}

export function UsersClient({ users, selfId }: Props) {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcuts: `/` focus search, `n` open create drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (dialogOpen) return;
      if (inField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setDialogOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Người dùng</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Quản lý tài khoản admin · đăng nhập bằng username + mật khẩu.
          </p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)} size="md">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo người dùng
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc username…"
                aria-label="Tìm người dùng"
                className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-muted-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="pointer-events-none absolute -bottom-5 left-1 text-[10px] text-muted-fg/80 sm:bottom-auto sm:right-auto sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:pointer-events-auto sm:hidden">
                /
              </kbd>
            </div>
            <div className="text-xs text-muted-fg">
              {query ? (
                <>
                  <span className="font-medium text-ink tabular-nums">{filtered.length}</span> /{' '}
                  {users.length} người dùng
                </>
              ) : (
                <>
                  <span className="font-medium text-ink tabular-nums">{users.length}</span> người
                  dùng
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[1fr_140px_220px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-fg md:grid">
              <span>Người dùng</span>
              <span>Ngày tạo</span>
              <span className="text-right">Hành động</span>
            </div>

            {filtered.length === 0 ? (
              <NoMatch query={query} onClear={() => setQuery('')} />
            ) : (
              <ul role="list" className="divide-y divide-border">
                {filtered.map((u) => (
                  <li key={u.id}>
                    <UserRow user={u} isSelf={u.id === selfId} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Keyboard hint */}
          <p className="mt-3 text-[11px] text-muted-fg">
            Phím tắt:{' '}
            <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
              /
            </kbd>{' '}
            tìm kiếm ·{' '}
            <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
              N
            </kbd>{' '}
            tạo mới
          </p>
        </>
      )}

      <CreateUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UsersIcon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">Chưa có người dùng</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-fg">
        Tạo tài khoản đầu tiên để cộng tác viên có thể đăng nhập vào trang quản trị.
      </p>
      <Button type="button" onClick={onCreate} className="mt-5">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Tạo người dùng đầu tiên
      </Button>
    </Card>
  );
}

function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center text-sm text-muted-fg">
      <Search className="mb-2 h-5 w-5" aria-hidden="true" />
      <p>
        Không tìm thấy người dùng nào khớp với{' '}
        <span className="font-medium text-ink">"{query}"</span>.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted no-tap-highlight"
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}
