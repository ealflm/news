import { Controller, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PopupsService } from './popups.service';
import { verify } from './click-token.util';
import { loadEnv } from '../config/env';

@Controller('click')
export class ClickController {
  constructor(private readonly popups: PopupsService) {}

  @Post(':token')
  async track(
    @Param('token') token: string,
    @Query('t') trigger: string | undefined,
    @Res() res: Response,
  ) {
    const env = loadEnv();
    const payload = verify(token, env.HMAC_CLICK_SECRET);
    if (!payload) {
      res.status(204).end();
      return;
    }
    void this.popups.incrementClick(payload.popupId, payload.postId, trigger ?? 'unknown');
    res.status(204).end();
  }
}
