import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Parse `name=value; ...` Set-Cookie strings and return [name, value] pairs. */
function parseSetCookies(headers: Headers): Array<{ name: string; value: string }> {
  const list =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : ([] as string[]);
  const out: Array<{ name: string; value: string }> = [];
  for (const raw of list) {
    const first = raw.split(';', 1)[0];
    if (!first) continue;
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    out.push({ name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() });
  }
  return out;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  // 1. Try the access token first.
  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) return NextResponse.next();
  }

  // 2. Access missing/expired — try refreshing silently with refresh_token.
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  let refreshResp: Response;
  try {
    refreshResp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refresh_token=${refreshToken}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  if (!refreshResp.ok) {
    const res = NextResponse.redirect(new URL('/admin/login', req.url));
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    return res;
  }

  // Parse new cookies and forward them BOTH (a) to the downstream request
  // so server components in this same request see the fresh access_token,
  // and (b) to the browser response so the next request is authenticated.
  const pairs = parseSetCookies(refreshResp.headers);
  const cookieMap = new Map<string, string>();
  // Seed with existing cookies from the request
  req.cookies.getAll().forEach((c) => cookieMap.set(c.name, c.value));
  // Overwrite with refreshed ones
  pairs.forEach((p) => cookieMap.set(p.name, p.value));
  const cookieHeader = Array.from(cookieMap.entries())
    .map(([n, v]) => `${n}=${v}`)
    .join('; ');

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('cookie', cookieHeader);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Pass full Set-Cookie strings through to the browser so attributes (HttpOnly,
  // SameSite, Max-Age) are preserved exactly as the API emitted them.
  const rawSetCookies =
    typeof refreshResp.headers.getSetCookie === 'function'
      ? refreshResp.headers.getSetCookie()
      : [];
  for (const c of rawSetCookies) res.headers.append('set-cookie', c);
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
