import Link from 'next/link';
import type { Route } from 'next';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-heading text-lg font-bold text-foreground">News</p>
            <p className="mt-2 text-sm text-muted-fg">
              Tin tức cập nhật, drama hot, hàng hot trên các sàn TMĐT.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Khám phá</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href={'/' as Route} className="text-muted-fg hover:text-primary">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href={'/tim-kiem' as Route} className="text-muted-fg hover:text-primary">
                  Tìm kiếm
                </Link>
              </li>
              <li>
                <Link href={'/rss.xml' as Route} className="text-muted-fg hover:text-primary">
                  RSS
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs text-muted-fg">
          © {new Date().getFullYear()} News.
        </p>
      </div>
    </footer>
  );
}
