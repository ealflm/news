import { z } from 'zod';

export const LinkPlatformSchema = z.enum(['SHOPEE', 'TIKTOK', 'LAZADA', 'OTHER']);
export type LinkPlatform = z.infer<typeof LinkPlatformSchema>;

export const LinkDeviceSchema = z.enum(['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK']);
export type LinkDevice = z.infer<typeof LinkDeviceSchema>;

export const OverrideActionSchema = z.enum(['ATTACH', 'DETACH']);
export type OverrideAction = z.infer<typeof OverrideActionSchema>;

export const PopupLinkInputSchema = z.object({
  platform: LinkPlatformSchema,
  device: LinkDeviceSchema,
  url: z.string().min(1).max(4000),
  label: z.string().max(200).optional(),
});
export type PopupLinkInput = z.infer<typeof PopupLinkInputSchema>;

export const CreatePopupInputSchema = z.object({
  name: z.string().min(1).max(200),
  bannerUrl: z.string().min(1).max(2000),
  delayMs: z.number().int().min(0).max(3_600_000),
  isGlobal: z.boolean().optional(),
  enabled: z.boolean().optional(),
  cookieKey: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/),
  cookieDays: z.number().int().min(1).max(365).optional(),
  forceClickOnClose: z.boolean().optional(),
  hideOnDesktop: z.boolean().optional(),
  hideOnBot: z.boolean().optional(),
  links: z.array(PopupLinkInputSchema).default([]),
});
export type CreatePopupInput = z.infer<typeof CreatePopupInputSchema>;

export const UpdatePopupInputSchema = CreatePopupInputSchema.partial();
export type UpdatePopupInput = z.infer<typeof UpdatePopupInputSchema>;

export const PostPopupOverrideInputSchema = z.object({
  popupId: z.string().min(1),
  action: OverrideActionSchema,
});
export type PostPopupOverrideInput = z.infer<typeof PostPopupOverrideInputSchema>;
