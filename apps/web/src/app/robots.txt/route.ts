export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${baseUrl}/sitemap.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
