import type { PostStatus } from './post.schemas';

export interface PublicPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  coverImageUrl: string | null;
  publishedAt: string;
  author: { displayName: string };
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  viewCount: number;
}

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentJson: unknown;
  contentHtml: string;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  authorId: string;
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  status: PostStatus;
}
