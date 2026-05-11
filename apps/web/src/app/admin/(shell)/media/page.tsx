import { MediaLibrary } from './media-library';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return <MediaLibrary apiUrl={apiUrl} />;
}
