'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  Newspaper,
  Users,
  History,
} from 'lucide-react';

const NAV: Array<{ href: Route; label: string; Icon: typeof LayoutDashboard }> = [
  { href: '/admin' as Route, label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/posts' as Route, label: 'Bài viết', Icon: FileText },
  { href: '/admin/media' as Route, label: 'Media', Icon: ImageIcon },
  { href: '/admin/popups' as Route, label: 'Popups', Icon: Sparkles },
  { href: '/admin/analytics' as Route, label: 'Analytics', Icon: BarChart3 },
  { href: '/admin/users' as Route, label: 'Người dùng', Icon: Users },
  { href: '/admin/audit' as Route, label: 'Audit log', Icon: History },
  { href: '/admin/settings' as Route, label: 'Cài đặt', Icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
          <Newspaper className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="font-heading text-lg font-bold text-foreground">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors no-tap-highlight ${
                active
                  ? 'bg-primary text-on-primary'
                  : 'text-ink/80 hover:bg-muted hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/logout" method="post" className="border-t border-border p-3">
        <button
          type="submit"
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-ink/70 transition-colors hover:bg-muted hover:text-destructive no-tap-highlight cursor-pointer"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Đăng xuất
        </button>
      </form>
    </aside>
  );
}
