import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));

  const payload = await verifyAccessToken(token);
  if (!payload) return NextResponse.redirect(new URL('/admin/login', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
