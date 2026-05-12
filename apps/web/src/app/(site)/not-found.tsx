import Link from 'next/link';
import type { Route } from 'next';
import type { Metadata } from 'next';
import { Home, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  description: 'Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.',
};

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16 sm:px-6 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(55% 50% at 50% 28%, rgba(125,211,252,0.18), transparent 70%)',
        }}
      />

      <div className="mx-auto w-full max-w-xl text-center">
        <p className="mb-6 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          <span className="h-px w-10 bg-accent/40" aria-hidden="true" />
          Lỗi 404
          <span className="h-px w-10 bg-accent/40" aria-hidden="true" />
        </p>

        <p
          aria-hidden="true"
          className="select-none font-heading text-[clamp(7rem,22vw,12rem)] font-bold leading-none tracking-tight text-foreground"
        >
          404
        </p>

        <h1
          id="not-found-title"
          className="mt-6 font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl"
        >
          Không tìm thấy trang
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-fg sm:text-lg">
          Bài viết có thể đã bị gỡ, đường dẫn đã thay đổi, hoặc URL bạn nhập chưa chính xác.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={'/' as Route}
            className="no-tap-highlight inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Về trang chủ
          </Link>
          <Link
            href={'/tim-kiem' as Route}
            className="no-tap-highlight inline-flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Tìm kiếm bài viết
          </Link>
        </div>
      </div>
    </section>
  );
}
