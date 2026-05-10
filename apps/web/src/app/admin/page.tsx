import { cookies } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function getMe(): Promise<{ email: string; displayName: string } | null> {
  const cookie = (await cookies()).get('access_token');
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `access_token=${cookie.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as { email: string; displayName: string };
}

export default async function AdminDashboard() {
  const me = await getMe();
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 text-gray-600">
        Xin chào, {me?.displayName ?? '...'} ({me?.email ?? '...'})
      </p>
      <form action="/api/auth/logout" method="post" className="mt-4">
        <button type="submit" className="rounded border px-3 py-1 text-sm">
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
