import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const r = await fetch(`${API_URL}/api/popups/overrides/${postId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(null, { status: r.status });
}
