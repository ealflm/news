import { Calendar, Clock, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

export function PostStatusCard({ post }: { post: AdminPost }) {
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
    </Card>
  );
}
