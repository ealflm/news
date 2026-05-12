import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const r = await fetch(`${API_URL}/api/popups/cookie-key/suggest`, {
    headers: { cookie },
    cache: 'no-store',
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
