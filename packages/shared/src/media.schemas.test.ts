import { describe, it, expect } from 'vitest';
import { MediaKindSchema, ImageVariantsSchema, ListMediaQuerySchema } from './media.schemas';

describe('MediaKindSchema', () => {
  it('accepts IMAGE/VIDEO/EMBED', () => {
    expect(MediaKindSchema.safeParse('IMAGE').success).toBe(true);
    expect(MediaKindSchema.safeParse('VIDEO').success).toBe(true);
    expect(MediaKindSchema.safeParse('EMBED').success).toBe(true);
  });
  it('rejects other values', () => {
    expect(MediaKindSchema.safeParse('AUDIO').success).toBe(false);
  });
});

describe('ImageVariantsSchema', () => {
  it('accepts string-record', () => {
    expect(ImageVariantsSchema.safeParse({ '320w': 'a.jpg', avif_720w: 'b.avif' }).success).toBe(
      true,
    );
  });
  it('rejects non-string values', () => {
    expect(ImageVariantsSchema.safeParse({ '320w': 123 }).success).toBe(false);
  });
});

describe('ListMediaQuerySchema', () => {
  it('coerces limit string to number', () => {
    const r = ListMediaQuerySchema.safeParse({ limit: '50' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.limit).toBe(50);
  });
  it('caps limit at 100', () => {
    expect(ListMediaQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
  it('defaults limit to 40', () => {
    const r = ListMediaQuerySchema.safeParse({});
    expect(r.success && r.data.limit).toBe(40);
  });
});
