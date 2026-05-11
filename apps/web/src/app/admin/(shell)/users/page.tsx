import { listUsers, listPendingInvites } from '@/lib/users';
import { Card } from '@/components/ui/card';
import { InvitePanel } from './invite-panel';
import { UserRow } from './user-row';
import { InviteRow } from './invite-row';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [users, invites] = await Promise.all([listUsers(), listPendingInvites()]);
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Người dùng</h1>
        <p className="mt-1 text-sm text-muted-fg">Quản lý admin và mời thêm thành viên</p>
      </div>

      <InvitePanel />

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-semibold text-ink">
          Đang hoạt động ({users.length})
        </h2>
        <Card className="divide-y divide-border">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </Card>
      </section>

      {invites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-lg font-semibold text-ink">
            Lời mời đang chờ ({invites.length})
          </h2>
          <Card className="divide-y divide-border">
            {invites.map((i) => (
              <InviteRow key={i.id} invite={i} />
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
