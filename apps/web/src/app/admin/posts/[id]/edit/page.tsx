import { notFound } from 'next/navigation';
import { getAdminPost } from '@/lib/posts';
import { listPopups, getPostOverrides } from '@/lib/popups';
import { PostForm } from '../../editor/post-form';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();
  const [popups, overrides] = await Promise.all([listPopups(), getPostOverrides(id)]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài: {post.title}</h1>
      <PostForm
        initial={post}
        popups={popups}
        initialOverrides={overrides.map((o) => ({ popupId: o.popupId, action: o.action }))}
      />
    </main>
  );
}
