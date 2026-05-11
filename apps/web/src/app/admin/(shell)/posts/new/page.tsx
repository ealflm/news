import { PostForm } from '../editor/post-form';

export default function NewPostPage() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Tạo bài mới</h1>
      <PostForm />
    </main>
  );
}
