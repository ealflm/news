import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/posts', () => ({
  listAllPublishedForSitemap: async () => [
    { slug: 'one', publishedAt: '2026-05-10T10:00:00.000Z', updatedAt: '2026-05-10T10:00:00.000Z' },
  ],
}));

describe('sitemap.xml', () => {
  it('renders entries with /yyyy/mm/dd/slug url', async () => {
    process.env.PUBLIC_BASE_URL = 'https://example.com';
    const { GET } = await import('../src/app/sitemap.xml/route');
    const res = await GET();
    const text = await res.text();
    expect(res.headers.get('content-type')).toBe('application/xml');
    expect(text).toContain('https://example.com/2026/05/10/one');
  });
});
