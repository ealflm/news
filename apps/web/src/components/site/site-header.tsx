import Link from 'next/link';
import type { Route } from 'next';
import { Newspaper, Search } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href={'/' as Route}
          className="group flex items-center gap-2 no-tap-highlight"
          aria-label="Trang chủ"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-on-primary">
            <Newspaper className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground transition-colors group-hover:text-primary">
            News
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Chính">
          <Link
            href={'/' as Route}
            className="text-sm font-medium text-ink/80 transition-colors hover:text-primary"
          >
            Mới nhất
          </Link>
          <Link
            href={'/tim-kiem' as Route}
            className="text-sm font-medium text-ink/80 transition-colors hover:text-primary"
          >
            Tìm kiếm
          </Link>
        </nav>

        <Link
          href={'/tim-kiem' as Route}
          aria-label="Tìm kiếm"
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink/70 transition-colors hover:bg-muted hover:text-primary md:h-9 md:w-9"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
