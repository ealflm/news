import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const r = await fetch(`${API_URL}/api/users/invite`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
