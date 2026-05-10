import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function passthrough(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  return passthrough(
    await fetch(`${API_URL}/api/posts/${id}`, {
      headers: { cookie },
    }),
  );
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';
  return passthrough(
    await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body,
    }),
  );
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  return passthrough(
    await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { cookie },
    }),
  );
}
