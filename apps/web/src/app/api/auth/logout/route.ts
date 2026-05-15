import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: req.headers.get('cookie') ?? '' },
  });
  // Client handles navigation; we only forward Set-Cookie (clears the auth
  // cookies). Returning 204 avoids relying on browser redirect-follow behaviour
  // for fetch-initiated POSTs.
  const res = new NextResponse(null, { status: 204 });
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) res.headers.append('set-cookie', c);
  return res;
}
