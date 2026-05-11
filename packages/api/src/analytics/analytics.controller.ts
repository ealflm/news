import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { loadEnv } from '../config/env';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // PUBLIC view ingestion — called by post detail page on render
  @Post('view')
  @HttpCode(204)
  async recordView(
    @Body()
    body: {
      postId: string;
      device?: string;
      inFbApp?: boolean;
      referrer?: string;
      sessionId?: string;
    },
    @Req() req: Request,
  ) {
    if (!body?.postId) return;
    const env = loadEnv();
    const salt = env.HMAC_CLICK_SECRET; // reuse for IP hashing
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip =
      (forwarded ? forwarded.split(',')[0]?.trim() : undefined) ?? req.socket.remoteAddress ?? '';
    const ipHash = ip
      ? createHash('sha256')
          .update(ip + salt)
          .digest('hex')
          .slice(0, 32)
      : null;
    // fire-and-forget (recordView swallows errors internally, but catch defensively)
    this.analytics
      .recordView({
        postId: body.postId,
        sessionId: body.sessionId ?? null,
        ipHash,
        device: body.device ?? null,
        inFbApp: body.inFbApp ?? false,
        referrer: body.referrer ?? null,
      })
      .catch(() => {});
  }

  // ADMIN endpoints
  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async overview(@Query('window') windowRaw?: string) {
    const window = Math.min(Math.max(parseInt(windowRaw ?? '7', 10) || 7, 1), 90);
    return this.analytics.getOverview(window);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rollup')
  @HttpCode(200)
  async rollup(@Body() body: { day?: string }) {
    const day = body?.day ? new Date(body.day) : undefined;
    return this.analytics.runDailyRollup(day);
  }

  @UseGuards(JwtAuthGuard)
  @Get('range')
  async rangeOverview(
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
    @Query('granularity') granularity?: string,
    @Query('device') device?: string,
  ) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400_000));
    return this.analytics.getOverview(days);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-device')
  async byDevice(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    return this.analytics.getByDevice(from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-platform')
  async byPlatform(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    return this.analytics.getByPlatformSimple(from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-hour')
  async byHour(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    return this.analytics.getClicksByHour(from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('funnel')
  async funnel(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    return this.analytics.getFunnel(from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referrers')
  async referrers(
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const to = toRaw ? new Date(toRaw) : new Date();
    const from = fromRaw ? new Date(fromRaw) : new Date(Date.now() - 7 * 86400_000);
    const limit = Math.min(Math.max(parseInt(limitRaw ?? '10', 10) || 10, 1), 100);
    return this.analytics.getTopReferrers(from, to, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/posts.csv')
  async exportPostsCsv(@Query('window') windowRaw: string | undefined, @Res() res: Response) {
    const window = Math.min(Math.max(parseInt(windowRaw ?? '30', 10) || 30, 1), 365);
    const csv = await this.analytics.exportPostsCsv(window);
    res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename=posts-${window}d.csv`)
      .send(csv);
  }
}
