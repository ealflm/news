import { createHmac, timingSafeEqual } from 'node:crypto';

const VERSION = 'v1';

export interface ClickPayload {
  popupId: string;
  postId: string | null;
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function sign(payload: ClickPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac('sha256', secret).update(`${VERSION}.${body}`).digest());
  return `${VERSION}.${body}.${mac}`;
}

export function verify(token: string, secret: string): ClickPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [v, body, mac] = parts as [string, string, string];
  const expectedMac = b64url(createHmac('sha256', secret).update(`${v}.${body}`).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ClickPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
