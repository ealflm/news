import { cookies } from 'next/headers';
import type { AdminPopup, OverrideAction } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listPopups(): Promise<AdminPopup[]> {
  const res = await fetch(`${API_URL}/api/popups`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listPopups failed: ${res.status}`);
  return res.json();
}

export async function getPopup(id: string): Promise<AdminPopup | null> {
  const res = await fetch(`${API_URL}/api/popups/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getPopup failed: ${res.status}`);
  return res.json();
}

export async function getPostOverrides(
  postId: string,
): Promise<{ id: string; popupId: string; action: OverrideAction; order: number }[]> {
  const res = await fetch(`${API_URL}/api/popups/overrides/${postId}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getPopupBundleBase64(postId: string): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/popup-bundle/${postId}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { empty: boolean; base64: string };
  if (data.empty) return null;
  return data.base64;
}
