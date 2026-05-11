import { AcceptInviteForm } from './accept-form';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; name?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">Tham gia News admin</h1>
          <p className="mt-2 text-sm text-muted-fg">Đặt thông tin tài khoản để hoàn tất</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <AcceptInviteForm token={sp.token ?? ''} suggestedName={sp.name ?? ''} />
        </div>
      </div>
    </main>
  );
}
