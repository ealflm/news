import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const ip = (forwarded.split(',')[0] ?? '').trim();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (ip) headers['x-forwarded-for'] = ip;
  await fetch(`${API_URL}/api/analytics/view`, { method: 'POST', headers, body });
  return new NextResponse(null, { status: 204 });
}
