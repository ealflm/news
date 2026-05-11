import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const search = req.nextUrl.search;
  const r = await fetch(`${API_URL}/api/audit${search}`, { headers: { cookie } });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
