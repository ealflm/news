import Link from 'next/link';
import type { Route } from 'next';
import { Plus } from 'lucide-react';
import { listAdminPosts } from '@/lib/posts';
import { PostsFilter } from './posts-filter';
import { PostsTable } from './posts-table';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const sp = await searchParams;
  const query: { status?: string; q?: string; cursor?: string } = {};
  if (sp.status) query.status = sp.status;
  if (sp.q) query.q = sp.q;
  if (sp.cursor) query.cursor = sp.cursor;
  const data = await listAdminPosts(query);

  const sanitizedSp: { status?: string; q?: string } = {};
  if (sp.status) sanitizedSp.status = sp.status;
  if (sp.q) sanitizedSp.q = sp.q;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Bài viết</h1>
        <Link
          href={'/admin/posts/new' as Route}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 no-tap-highlight"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo bài mới
        </Link>
      </div>

      <PostsFilter initialQ={sp.q ?? ''} initialStatus={sp.status ?? ''} />

      <PostsTable
        key={`${sp.q ?? ''}|${sp.status ?? ''}`}
        items={data.items}
        nextCursor={data.nextCursor}
        searchParams={sanitizedSp}
      />
    </>
  );
}
