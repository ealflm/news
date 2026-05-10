import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
