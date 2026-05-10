import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) res.headers.append('set-cookie', c);
  return res;
}
