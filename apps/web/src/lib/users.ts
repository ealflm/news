import { cookies } from 'next/headers';
import type { UserListItem, PendingInvite, AuditLogItem } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listUsers(): Promise<UserListItem[]> {
  const r = await fetch(`${API_URL}/api/users`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`listUsers failed: ${r.status}`);
  return r.json();
}

export async function listPendingInvites(): Promise<PendingInvite[]> {
  const r = await fetch(`${API_URL}/api/users/invites`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return [];
  return r.json();
}

export async function listAuditLog(
  opts: { limit?: number } = {},
): Promise<{ items: AuditLogItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 50));
  const r = await fetch(`${API_URL}/api/audit?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return { items: [], nextCursor: null };
  return r.json();
}
