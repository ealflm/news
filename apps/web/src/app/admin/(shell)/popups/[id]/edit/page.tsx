import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPopup } from '@/lib/popups';
import { PopupForm } from '../../editor/popup-form';

export const dynamic = 'force-dynamic';

export default async function EditPopupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const popup = await getPopup(id);
  if (!popup) notFound();
  return (
    <>
      <div className="mx-auto mb-6 flex w-full max-w-[1120px] flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={'/admin/popups' as Route}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-primary no-tap-highlight"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Tất cả popup
          </Link>
          <h1 className="mt-1 font-heading text-3xl font-bold text-foreground">{popup.name}</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Sửa nội dung popup, link affiliate và cấu hình hiển thị.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-fg">
          <span
            className={`inline-flex h-5 items-center rounded-pill px-2 text-[11px] font-semibold uppercase tracking-wide ${
              popup.enabled
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-muted text-muted-fg'
            }`}
          >
            {popup.enabled ? 'Đang bật' : 'Đã tắt'}
          </span>
          {popup.isGlobal && (
            <span className="inline-flex h-5 items-center rounded-pill border border-accent/30 bg-accent/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
              Global
            </span>
          )}
        </div>
      </div>
      <PopupForm initial={popup} />
    </>
  );
}
