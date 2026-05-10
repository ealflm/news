import { Injectable } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { sign } from './click-token.util';
import { buildRuntimeJs } from './popup-runtime/runtime-template';
import { loadEnv } from '../config/env';

interface RuntimePopupConfig {
  id: string;
  cookieKey: string;
  cookieDays: number;
  delayMs: number;
  bannerUrl: string;
  flags: {
    hideOnDesktop: boolean;
    hideOnBot: boolean;
    forceClickOnClose: boolean;
  };
  links: Partial<Record<'IOS_FB' | 'IOS_SAFARI' | 'ANDROID' | 'DESKTOP_FALLBACK', string>>;
  token: string;
}

@Injectable()
export class PopupBundleService {
  constructor(private readonly popups: PopupsService) {}

  async getBundleForPost(postId: string): Promise<string> {
    const env = loadEnv();
    const applicable = await this.popups.listApplicableForPost(postId);
    if (applicable.length === 0) return '';

    const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
    const runtime: RuntimePopupConfig[] = applicable.map((p) => {
      const links: RuntimePopupConfig['links'] = {};
      for (const l of p.links) {
        links[l.device as 'IOS_FB' | 'IOS_SAFARI' | 'ANDROID' | 'DESKTOP_FALLBACK'] = l.url;
      }
      const token = sign({ popupId: p.id, postId, exp }, env.HMAC_CLICK_SECRET);
      return {
        id: p.id,
        cookieKey: p.cookieKey,
        cookieDays: p.cookieDays,
        delayMs: p.delayMs,
        bannerUrl: p.bannerUrl,
        flags: {
          hideOnDesktop: p.hideOnDesktop,
          hideOnBot: p.hideOnBot,
          forceClickOnClose: p.forceClickOnClose,
        },
        links,
        token,
      };
    });

    const config = {
      clickEndpoint: '/api/click',
      popups: runtime,
    };

    return buildRuntimeJs(JSON.stringify(config));
  }
}
