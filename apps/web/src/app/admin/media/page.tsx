import { listMedia } from '@/lib/media';
import { MediaGrid } from './media-grid';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const data = await listMedia({ limit: 60 });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Thư viện ảnh</h1>
      <MediaGrid initial={data.items} apiUrl={apiUrl} />
    </main>
  );
}
