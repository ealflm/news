import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// API routes the proxy must NOT gate. Login establishes the session;
// logout still needs to reach upstream even when the access token is gone;
// analytics/view is anonymous traffic.
const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout', '/api/analytics/view']);

function isProtectedPage(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/admin/login')) return false;
  return true;
}

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  return !PUBLIC_API_PATHS.has(pathname);
}

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

function unauthorized(req: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedPage = isProtectedPage(pathname);
  const protectedApi = isProtectedApi(pathname);
  if (!protectedPage && !protectedApi) return NextResponse.next();

  // 1. Try the access token first.
  const accessToken = req.cookies.get('access_token')?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) return NextResponse.next();
  }

  // 2. Access missing/expired — try refreshing silently with refresh_token.
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return unauthorized(req, protectedApi);
  }

  let refreshResp: Response;
  try {
    refreshResp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `refresh_token=${refreshToken}` },
      cache: 'no-store',
    });
  } catch {
    return unauthorized(req, protectedApi);
  }

  if (!refreshResp.ok) {
    const res = unauthorized(req, protectedApi);
    res.cookies.delete('access_token');
    res.cookies.delete('refresh_token');
    return res;
  }

  // Parse new cookies and forward them BOTH (a) to the downstream request
  // so server components / route handlers in this same request see the fresh
  // access_token, and (b) to the browser response so the next request is
  // authenticated.
  const pairs = parseSetCookies(refreshResp.headers);
  const cookieMap = new Map<string, string>();
  req.cookies.getAll().forEach((c) => cookieMap.set(c.name, c.value));
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
  matcher: ['/admin/:path*', '/', '/api/:path*'],
};
