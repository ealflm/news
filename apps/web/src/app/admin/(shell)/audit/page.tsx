import { AuditClient } from './audit-client';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Lịch sử hoạt động của admin · lọc theo username, hành động hoặc loại.
        </p>
      </div>
      <AuditClient />
    </>
  );
}
