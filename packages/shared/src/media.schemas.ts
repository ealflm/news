import { z } from 'zod';

export const MediaKindSchema = z.enum(['IMAGE', 'VIDEO', 'EMBED']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const ImageVariantsSchema = z.record(z.string());
export type ImageVariants = z.infer<typeof ImageVariantsSchema>;

export const ListMediaQuerySchema = z.object({
  kind: MediaKindSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});
export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;
