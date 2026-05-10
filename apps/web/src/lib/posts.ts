import { cookies } from 'next/headers';
import type { AdminPost, PostListItem, PublicPost } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listAdminPosts(query: {
  status?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: PostListItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const res = await fetch(`${API_URL}/api/posts?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listAdminPosts failed: ${res.status}`);
  return res.json();
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const res = await fetch(`${API_URL}/api/posts/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getAdminPost failed: ${res.status}`);
  return res.json();
}

export async function listPublishedPosts(opts: { limit?: number; cursor?: string } = {}): Promise<{
  items: (PostListItem & { author: { displayName: string } })[];
  nextCursor: string | null;
}> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 20));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const res = await fetch(`${API_URL}/api/posts/published?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`listPublishedPosts failed: ${res.status}`);
  return res.json();
}

export async function getPublishedPostBySlug(slug: string): Promise<PublicPost | null> {
  const res = await fetch(`${API_URL}/api/posts/published/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.id) return null;
  return data;
}

export async function listAllPublishedForSitemap(): Promise<
  { slug: string; publishedAt: string; updatedAt: string }[]
> {
  const res = await fetch(`${API_URL}/api/posts/sitemap-data`, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  return res.json();
}
