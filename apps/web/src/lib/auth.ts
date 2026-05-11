import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export interface AccessPayload {
  sub: string;
  username: string;
  type: 'access';
}

export interface MeUser {
  id: string;
  username: string;
  displayName: string;
}

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.type !== 'access') return null;
    return payload as unknown as AccessPayload;
  } catch {
    return null;
  }
}

export async function getMe(): Promise<MeUser | null> {
  const cookie = (await cookies()).get('access_token');
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `access_token=${cookie.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}
