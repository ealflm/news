import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/posts/${id}/unpublish`, {
    method: 'POST',
    headers: { cookie },
  });
  if (upstream.ok) {
    const post = await upstream.clone().json();
    if (post?.publishedAt && post?.slug) {
      const d = new Date(post.publishedAt);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      revalidatePath(`/${yyyy}/${mm}/${dd}/${post.slug}`);
    }
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');
  }
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
