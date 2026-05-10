import { notFound } from 'next/navigation';
import { getPopup } from '@/lib/popups';
import { PopupForm } from '../../editor/popup-form';

export const dynamic = 'force-dynamic';

export default async function EditPopupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const popup = await getPopup(id);
  if (!popup) notFound();
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa popup: {popup.name}</h1>
      <PopupForm initial={popup} />
    </main>
  );
}
