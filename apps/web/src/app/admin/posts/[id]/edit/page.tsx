import { notFound } from 'next/navigation';
import { getAdminPost } from '@/lib/posts';
import { PostForm } from '../../editor/post-form';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài: {post.title}</h1>
      <PostForm initial={post} />
    </main>
  );
}
