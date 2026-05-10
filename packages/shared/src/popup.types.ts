import type { LinkPlatform, LinkDevice, OverrideAction } from './popup.schemas';

export interface PopupLinkRecord {
  id: string;
  platform: LinkPlatform;
  device: LinkDevice;
  url: string;
  label: string | null;
}

export interface AdminPopup {
  id: string;
  name: string;
  bannerUrl: string;
  delayMs: number;
  isGlobal: boolean;
  enabled: boolean;
  cookieKey: string;
  cookieDays: number;
  forceClickOnClose: boolean;
  hideOnDesktop: boolean;
  hideOnBot: boolean;
  configVersion: number;
  links: PopupLinkRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PostPopupOverrideRecord {
  id: string;
  popupId: string;
  action: OverrideAction;
  order: number;
}
