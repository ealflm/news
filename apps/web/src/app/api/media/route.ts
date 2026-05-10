import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/media/upload`, {
    method: 'POST',
    headers: {
      cookie,
      'content-type': req.headers.get('content-type') ?? 'application/octet-stream',
    },
    body: req.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const search = req.nextUrl.search;
  const upstream = await fetch(`${API_URL}/api/media${search}`, { headers: { cookie } });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
