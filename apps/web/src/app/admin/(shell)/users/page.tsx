import { listUsers } from '@/lib/users';
import { getMe } from '@/lib/auth';
import { UsersClient } from './users-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const [users, me] = await Promise.all([listUsers(), getMe()]);
  return <UsersClient users={users} selfId={me?.id ?? null} />;
}
