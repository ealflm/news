import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { FileText, Image as ImageIcon, Sparkles, BarChart3, ArrowRight } from 'lucide-react';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function getMe(): Promise<{ email: string; displayName: string } | null> {
  const cookie = (await cookies()).get('access_token');
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `access_token=${cookie.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as { email: string; displayName: string };
}

const SHORTCUTS = [
  { href: '/admin/posts/new' as Route, label: 'Tạo bài viết mới', Icon: FileText },
  { href: '/admin/media' as Route, label: 'Quản lý media', Icon: ImageIcon },
  { href: '/admin/popups/new' as Route, label: 'Tạo popup mới', Icon: Sparkles },
  { href: '/admin/analytics' as Route, label: 'Xem analytics', Icon: BarChart3 },
];

export default async function AdminDashboard() {
  const me = await getMe();
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Xin chào, {me?.displayName ?? '...'} ({me?.email ?? '...'})
        </p>
      </div>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-4 font-heading text-lg font-semibold text-ink">
          Lối tắt
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary no-tap-highlight"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-4 font-heading text-base font-semibold text-ink transition-colors group-hover:text-primary">
                  {label}
                </p>
                <span className="mt-auto pt-3 inline-flex items-center gap-1 text-sm text-accent">
                  Mở
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
