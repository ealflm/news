import { listMedia } from '@/lib/media';
import { MediaGrid } from './media-grid';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const data = await listMedia({ limit: 60 });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return (
    <>
      <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">Thư viện ảnh</h1>
      <MediaGrid initial={data.items} apiUrl={apiUrl} />
    </>
  );
}
