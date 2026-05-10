import { listAllPublishedForSitemap } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const posts = await listAllPublishedForSitemap();
  const urls = posts
    .map((p) => {
      const d = new Date(p.publishedAt);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `<url><loc>${baseUrl}/${yyyy}/${mm}/${dd}/${p.slug}</loc><lastmod>${p.updatedAt}</lastmod></url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}</loc></url>${urls}</urlset>`;

  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
