import { z } from 'zod';

export const PostStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']);
export type PostStatus = z.infer<typeof PostStatusSchema>;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreatePostInputSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().regex(slugRegex).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  contentJson: z.unknown().optional(),
  coverImageUrl: z.string().url().optional(),
  status: PostStatusSchema.optional(),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDesc: z.string().max(500).optional(),
  ogImageUrl: z.string().url().optional(),
});
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const UpdatePostInputSchema = CreatePostInputSchema.partial();
export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;

export const ListPostsQuerySchema = z.object({
  status: PostStatusSchema.optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListPostsQuery = z.infer<typeof ListPostsQuerySchema>;
