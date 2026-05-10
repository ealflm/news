import { Controller, Get, Param } from '@nestjs/common';
import { PopupBundleService } from './popup-bundle.service';

@Controller('popup-bundle')
export class PopupBundleController {
  constructor(private readonly bundle: PopupBundleService) {}

  @Get(':postId')
  async getBundle(@Param('postId') postId: string) {
    const js = await this.bundle.getBundleForPost(postId);
    if (!js) return { js: '', base64: '', empty: true };
    const base64 = Buffer.from(js, 'utf8').toString('base64');
    return { js, base64, empty: false };
  }
}
