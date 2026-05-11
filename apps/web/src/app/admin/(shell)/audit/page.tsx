import { Card } from '@/components/ui/card';
import { listAuditLog } from '@/lib/users';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  'post.create': 'Tạo bài',
  'post.update': 'Sửa bài',
  'post.publish': 'Xuất bản',
  'post.unpublish': 'Bỏ xuất bản',
  'post.delete': 'Xóa bài',
};

export default async function AuditPage() {
  const { items } = await listAuditLog({ limit: 100 });
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-fg">Lịch sử thay đổi gần nhất ({items.length})</p>
      </div>
      <Card className="divide-y divide-border">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-fg">Chưa có hoạt động nào.</p>
        ) : (
          items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                {ACTION_LABEL[i.action] ?? i.action}
              </span>
              <span className="truncate text-ink">
                {i.actorUsername ? `@${i.actorUsername}` : 'system'}
              </span>
              <span className="text-muted-fg">·</span>
              <span className="truncate text-muted-fg">
                {i.targetType}
                {i.targetId ? ` #${i.targetId.slice(0, 8)}` : ''}
              </span>
              {i.meta != null &&
              typeof i.meta === 'object' &&
              'title' in (i.meta as Record<string, unknown>) ? (
                <span className="text-muted-fg truncate">
                  — {(i.meta as { title: string }).title}
                </span>
              ) : null}
              <span className="ml-auto text-xs text-muted-fg">
                {new Date(i.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
