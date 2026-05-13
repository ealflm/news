import { Calendar, Clock, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CopyUrlButton } from '@/components/ui/copy-url-button';
import type { AdminPost } from '@news/shared';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  SCHEDULED: 'Đã lên lịch',
};

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-muted-fg',
  PUBLISHED: 'bg-success',
  SCHEDULED: 'bg-accent',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function postPath(post: AdminPost): string | null {
  if (!post.publishedAt || !post.slug) return null;
  const d = new Date(post.publishedAt);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `/${yyyy}/${mm}/${dd}/${post.slug}`;
}

export function PostStatusCard({ post }: { post: AdminPost }) {
  const path = postPath(post);
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-fg">Trạng thái</p>
      <div className="mb-4 inline-flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${STATUS_DOT[post.status] ?? 'bg-muted-fg'}`}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-ink">
          {STATUS_LABEL[post.status] ?? post.status}
        </span>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-fg">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Tạo lúc</dt>
          <dd>
            Tạo: <span className="text-ink">{fmt(post.createdAt)}</span>
          </dd>
        </div>
        <div className="flex items-center gap-2 text-muted-fg">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Cập nhật lúc</dt>
          <dd>
            Sửa: <span className="text-ink">{fmt(post.updatedAt)}</span>
          </dd>
        </div>
        {post.publishedAt && (
          <div className="flex items-center gap-2 text-muted-fg">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <dt className="sr-only">Xuất bản</dt>
            <dd>
              Xuất bản: <span className="text-ink">{fmt(post.publishedAt)}</span>
            </dd>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-fg">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Lượt xem</dt>
          <dd>
            Lượt xem:{' '}
            <span className="font-medium text-ink tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(post.viewCount)}
            </span>
          </dd>
        </div>
      </dl>
      {path && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-fg">
            URL công khai
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs text-ink">
              {path}
            </code>
            <CopyUrlButton path={path} size="sm" />
          </div>
        </div>
      )}
    </Card>
  );
}
