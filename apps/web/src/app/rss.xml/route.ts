import { listPublishedPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const data = await listPublishedPosts({ limit: 50 });
  const items = data.items
    .filter((p) => p.publishedAt)
    .map((p) => {
      const d = new Date(p.publishedAt!);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const url = `${baseUrl}/${yyyy}/${mm}/${dd}/${p.slug}`;
      return `<item><title>${escape(p.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(
        p.publishedAt!,
      ).toUTCString()}</pubDate>${p.excerpt ? `<description>${escape(p.excerpt)}</description>` : ''}</item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>News</title><link>${baseUrl}</link><description>Latest posts</description>${items}</channel></rss>`;

  return new Response(xml, { headers: { 'content-type': 'application/rss+xml' } });
}
