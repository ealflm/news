import { describe, it, expect } from 'vitest';
import { CreatePopupInputSchema, LinkPlatformSchema, LinkDeviceSchema } from './popup.schemas';

describe('CreatePopupInputSchema', () => {
  it('accepts minimal valid', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'Shopee 3s',
      bannerUrl: 'https://example.com/banner.jpg',
      delayMs: 3000,
      cookieKey: 'popup_3s',
    });
    expect(r.success).toBe(true);
  });
  it('rejects invalid cookieKey', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'x',
      bannerUrl: 'https://x',
      delayMs: 100,
      cookieKey: 'has space',
    });
    expect(r.success).toBe(false);
  });
  it('rejects negative delay', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'x',
      bannerUrl: 'https://x',
      delayMs: -1,
      cookieKey: 'ok_key',
    });
    expect(r.success).toBe(false);
  });
});

describe('LinkPlatformSchema', () => {
  it('accepts all 4 platforms', () => {
    expect(LinkPlatformSchema.safeParse('SHOPEE').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('TIKTOK').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('LAZADA').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('OTHER').success).toBe(true);
  });
});

describe('LinkDeviceSchema', () => {
  it('accepts 4 devices', () => {
    ['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK'].forEach((d) =>
      expect(LinkDeviceSchema.safeParse(d).success).toBe(true),
    );
  });
});
