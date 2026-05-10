import { jwtVerify } from 'jose';

export interface AccessPayload {
  sub: string;
  email: string;
  type: 'access';
}

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
