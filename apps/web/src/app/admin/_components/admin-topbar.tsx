'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { Menu, Newspaper } from 'lucide-react';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Sparkles,
  BarChart3,
  Settings,
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

export function AdminTopbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-on-primary">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-heading text-base font-bold text-foreground">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Mở menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink hover:bg-muted no-tap-highlight"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      {open && (
        <nav
          className="border-b border-border bg-surface px-3 py-2 lg:hidden"
          aria-label="Admin mobile"
        >
          {NAV.map(({ href, label, Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors no-tap-highlight ${
                  active ? 'bg-primary text-on-primary' : 'text-ink/80 hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
