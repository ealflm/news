import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

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

  // Fetch post info before delete so we can revalidate its public URL
  let postUrl: string | null = null;
  try {
    const pre = await fetch(`${API_URL}/api/posts/${id}`, { headers: { cookie } });
    if (pre.ok) {
      const post = await pre.json();
      if (post?.publishedAt && post?.slug) {
        const d = new Date(post.publishedAt);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        postUrl = `/${yyyy}/${mm}/${dd}/${post.slug}`;
      }
    }
  } catch {
    // best-effort; continue with delete
  }

  const upstream = await fetch(`${API_URL}/api/posts/${id}`, {
    method: 'DELETE',
    headers: { cookie },
  });

  if (upstream.ok) {
    if (postUrl) revalidatePath(postUrl);
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');
  }

  return passthrough(upstream);
}
