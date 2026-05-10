import { cookies } from 'next/headers';
import type { MediaListResponse, MediaRecord } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listMedia(
  opts: { cursor?: string; limit?: number } = {},
): Promise<MediaListResponse> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit) params.set('limit', String(opts.limit));
  const res = await fetch(`${API_URL}/api/media?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listMedia failed: ${res.status}`);
  return res.json();
}

export async function getMedia(id: string): Promise<MediaRecord | null> {
  const res = await fetch(`${API_URL}/api/media/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getMedia failed: ${res.status}`);
  return res.json();
}

export function pickImageSrc(
  variants: Record<string, string> | null,
  desiredWidth = 720,
): string | null {
  if (!variants) return null;
  const widths = Object.keys(variants)
    .filter((k) => /^\d+w$/.test(k))
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  const w = widths.find((x) => x >= desiredWidth) ?? widths[widths.length - 1];
  return w ? (variants[`${w}w`] ?? null) : null;
}
