import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const r = await fetch(`${API_URL}/api/popups/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const r = await fetch(`${API_URL}/api/popups/${id}`, { method: 'DELETE', headers: { cookie } });
  return new NextResponse(null, { status: r.status });
}
