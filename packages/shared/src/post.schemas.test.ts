import { describe, it, expect } from 'vitest';
import { CreatePostInputSchema, UpdatePostInputSchema, PostStatusSchema } from './post.schemas';

describe('CreatePostInputSchema', () => {
  it('accepts minimal valid input (title only)', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'Hello' });
    expect(r.success).toBe(true);
  });

  it('rejects empty title', () => {
    const r = CreatePostInputSchema.safeParse({ title: '' });
    expect(r.success).toBe(false);
  });

  it('accepts full payload with contentJson', () => {
    const r = CreatePostInputSchema.safeParse({
      title: 'Full',
      slug: 'full-post',
      excerpt: 'short summary',
      contentJson: { type: 'doc', content: [] },
      coverImageUrl: 'https://example.com/c.jpg',
      status: 'DRAFT',
      seoTitle: 'SEO',
      seoDesc: 'desc',
      ogImageUrl: 'https://example.com/og.jpg',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'x', status: 'BOGUS' as never });
    expect(r.success).toBe(false);
  });

  it('rejects invalid coverImageUrl', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'x', coverImageUrl: 'not a url' });
    expect(r.success).toBe(false);
  });
});

describe('UpdatePostInputSchema', () => {
  it('accepts partial updates', () => {
    const r = UpdatePostInputSchema.safeParse({ title: 'New Title' });
    expect(r.success).toBe(true);
  });

  it('accepts publishedAt as ISO string', () => {
    const r = UpdatePostInputSchema.safeParse({ publishedAt: '2026-05-10T10:00:00.000Z' });
    expect(r.success).toBe(true);
  });
});

describe('PostStatusSchema', () => {
  it('accepts DRAFT/SCHEDULED/PUBLISHED', () => {
    expect(PostStatusSchema.safeParse('DRAFT').success).toBe(true);
    expect(PostStatusSchema.safeParse('SCHEDULED').success).toBe(true);
    expect(PostStatusSchema.safeParse('PUBLISHED').success).toBe(true);
  });
});
